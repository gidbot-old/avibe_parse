var SC = require('node-soundcloud');
var https = require('https');
var fs = require('fs');
var CronJob = require('cron').CronJob;
var Parse = require('parse/node').Parse;
Parse.initialize("RdJVAvoHpmjpqxndp45yD7Ty56HJqM98r0Jt640I", "VdjZ4XIHO3W6Kfwj39S0pUHyTy04VhIAW436fvvX");

var request = require('request').defaults({ encoding: null });



var sc_ids = [
	'mugatunesofficial', 
	'complexmag', 
	'highonmusic1', 
	'maddecent',
	'foolsgoldrecs', 
	'beautifulbuzzz',
	'audioicecream',
	'cavemansound',
	'1833-fm',
	'tropical-frnds',
	'magic-vibe',
	'tipsytortoise'
];


// Initialize client 
SC.init({
  id: '59eb1477141bd5ebe585541570e6d9c8',
  secret: '16f66a79807d8981088dc416bea52ed7',
});

var download = function (playlist, callback) {
	if (playlist.artwork_url) {
		var url = playlist.artwork_url.replace("large", "t200x200");
		request.get(url, function (error, response, body) {
	    	if (!error && response.statusCode == 200) {
	        	var data = new Buffer(body).toString('base64');
	        	var toReturn = { 
	        		base64: data.toString() 
	        	} 
	        	callback(toReturn, playlist);
	    	}
		});
	} else { 
		callback(null, playlist);
	}
}

var getNewTracks = function (playlist, user_id, callback) {
	var titles = []; 
	var playlistsCheck = []; 
	
	playlistsCheck.push(playlist.title);
	for (var j = 0; j < playlist.tracks.length; j++){
		titles.push(playlist.tracks[j].title);
	}
	

	var Playlist = Parse.Object.extend("Playlists");
	var query = new Parse.Query(Playlist);

	query.equalTo("user", user_id);
	query.containedIn("name", playlistsCheck);
	query.containedIn("title", titles);
	query.limit(1000)

	query.find({
	  success: function(results) {
	  	var parseCheck = [];
	  	var toReturn = []; 
	  	for (var i = 0; i < results.length; i++) {
	  		parseCheck.push(results[i].get("title") + ":" + results[i].get("name"));
	  	}
  		
  		for (var j = 0; j < playlist.tracks.length; j++){
	  		var check = playlist.tracks[j].title + ":" + playlist.title; 			  		
	  		if (parseCheck.indexOf(check) < 0) {
	  			toReturn.push({
	  				song_title: playlist.tracks[j].title,
	  				artist: playlist.tracks[j].user.username,
	  				playlist_name: playlist.title
	  			})
	  		}
	  	}
  	
	  	callback(toReturn);

	  },
	  error: function(error) {
	  	console.log('Searching for Tracks Error');
	  	console.log(error); 
	    callback(false);
	  }
	});
}

var getNewPosts = function (posts, user_id, callback) {
	var titles = []; 
	var artists = []; 

	for (var i = 0; i < posts.length; i++) {
		titles.push(posts[i].title); 
		artists.push(posts[i].user.username);
	}

	var ParsePost = Parse.Object.extend("Posts");
	var query = new Parse.Query(ParsePost);
	query.containedIn("title", titles);
	query.equalTo("user", user_id);
	query.containedIn("artist", artists);
	query.limit(1000);

	query.find({
	  success: function(results) {
	  	var parseCheck = [];
	  	var toReturn = []; 
	  	for (var i = 0; i < results.length; i++) {
	  		parseCheck.push(results[i].get("title") + ":" + results[i].get("artist"));
	  	}
	  	for (var i = 0; i < posts.length; i++) {
	  		var check = posts[i].title + ":" + posts[i].user.username; 
	  		if (parseCheck.indexOf(check) < 0) {
	  			toReturn.push({
	  				title: posts[i].title,
	  				artist: posts[i].user.username
	  			})
	  		}
	  	}
	  	callback(toReturn);
	  },
	  error: function(error) {
	  	console.log(error); 
	    callback(false);
	  }
	});
}

var savePlaylist = function (playlist, callback) {
	playlist.save(null, {
	  success: function(playlistName) {
	    console.log('Added Playlist Name');
	  },
	  error: function(playlistName, error) {
	    console.log('Save Playlist Error');
	    console.log(error);
	  }
	});
}

var checkName = function (playlist, user_id, user_name) {
	var PlaylistName = Parse.Object.extend("PlaylistNames");
	var query = new Parse.Query(PlaylistName);
	query.equalTo("user", user_id);
	query.equalTo("name", playlist.title);
	query.first({
	  success: function(object) {
	  	var found = (object) ? true: false;
	  	if (!found) {
			var playlistName = new PlaylistName();
			playlistName.set("user", user_id); 
			playlistName.set("userName", user_name); 
			playlistName.set("name", playlist.title); 
			if (playlist.artwork_url) {
				download(playlist, function (image) {
					var parseFile = new Parse.File('artwork.png', image);
					parseFile.save().then(function() {
						playlistName.set("image", parseFile);
						savePlaylist(playlistName);
					}, function(error){	
						console.log('Error Saving Image');
					});
				}); 
			} else { 
				savePlaylist(playlistName);
			}	
	  	} 
	  },
	  error: function(error) {
	  	console.log('Searching for Playlist Error');
	  	console.log(error); 
	    callback(true, playlist);
	  }
	});
}

var getParseUser = function (sc_id, callback) {
	var User = Parse.Object.extend("User");
	var query = new Parse.Query(User);
	query.equalTo("soundcloudUsername", sc_id);
	query.first({
	  success: function(object) {
	  	var display_name = object.get('name');
	  	var user_name = object.get('username');
	  	callback(object.id, display_name, user_name);
	  },
	  error: function(error) {
	  	console.log('Get User Error');
	  	console.log(error); 
	  }
	});

}

var calculate_posts = function (sc_id, posts) {
	var postsToSave = []; 
	getParseUser(sc_id, function (parseUserId, parseDisplayName, parseUserName) {
	    getNewPosts(posts, parseUserId, function (new_posts) {
			for (var i = 0; i < new_posts.length; i++) {

				var ParsePost= Parse.Object.extend("Posts");
				var parsePost = new ParsePost();
				parsePost.set('user', parseUserId); 
				parsePost.set('userName', parseDisplayName); 
				parsePost.set('username', parseUserName); 
				
				parsePost.set('title', new_posts[i].title); 
				parsePost.set('artist', new_posts[i].artist); 
				
				postsToSave.push(parsePost);
			} 
			
			Parse.Object.saveAll(postsToSave, {
			    success: function(list) {
			      	console.log('Successfully Added Posts');
			    },
			    error: function(error) {
			    	console.log('Error Saving Posts');
			    	console.log(error);
			    },
			});
		
		});  
    });
}

var run_tracks = function (sc_id) { 
	SC.get('/users/'+sc_id+'/tracks', function (err, tracks) {
	  if ( err ) {
	  	console.log(err); 
	  } else {
	  	calculate_posts(sc_id, tracks);
	  }
	}); 
}; 

var run_faves = function (sc_id) { 
	SC.get('/users/'+sc_id+'/favorites', function (err, favorites) {
	  if ( err ) {
	  	console.log(err); 
	  } else {
	  	calculate_posts(sc_id, favorites);
	  }

	}); 
}; 

var run_playlists = function (sc_id) {
	SC.get('/users/'+sc_id+'/playlists', function (err, playlists) {
	  if ( err ) {
	  	console.log(err); 
	  } else {
	  	getParseUser(sc_id, function (parseUserId, parseDisplayName) {
	    	for (var i = 0; i < playlists.length; i++) {

				getNewTracks(playlists[i], parseUserId, function (tracks) {
					console.log(tracks.length);
					var tracksToSave = [];
					for (var i = 0; i < tracks.length; i++) {
						var ParseTrack = Parse.Object.extend("Playlists");
						var parseTrack = new ParseTrack();
						parseTrack.set('source', 'soundcloud'); 
						parseTrack.set('user', parseUserId); 
						parseTrack.set('userName', parseDisplayName); 

						parseTrack.set('name', tracks[i].playlist_name); 
						parseTrack.set('title', tracks[i].song_title); 
						parseTrack.set('artist', tracks[i].artist); 
						tracksToSave.push(parseTrack);

		    		}	

		    		 Parse.Object.saveAll(tracksToSave, {
					    success: function(list) {
					      	console.log('Successfully Added Tracks');
					    },
					    error: function(error) {
					    	console.log('Error Saving');
					    	console.log(error);
					    },
					  });
		    	});

		    		checkName(playlists[i], parseUserId, parseDisplayName);
		    }
  
		});
	  }
	});
}

var start = function () {
	console.log('Script Started');
	for (var i = 0; i < sc_ids.length; i++) {
		run_tracks(sc_ids[i]);
		run_faves(sc_ids[i]);
		run_playlists(sc_ids[i]);
	}
}



