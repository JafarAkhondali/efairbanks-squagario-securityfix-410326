var http = require('http');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');
var path = require('path');
var env = {
	sessionIdIndex: 0,
	sessions: {
		0: {
			player: {
				x:0,
				y:0,
				size:1
			}
		}
	}
};
for(var i = 0; i < 200; i++) {
	env.sessions[1000+i]={
		player: {
			x: Math.floor((Math.random()*800-400)/5)*5,
			y: Math.floor((Math.random()*800-400)/5)*5,
			size: 0.99 
		}
	};
}
var server = http.createServer(function(request, response){
	if (request.method == 'POST') {
		var data;
		var body = '';
		response.setHeader('Content-Type', 'application/json');
		request.on('data', function (data) {
			body += data;
			if (body.length > 1e6) { 
				// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
				request.connection.destroy();
			}
		});
		request.on('end', function () {
			data = querystring.parse(body);
			var send = {action: data.action};
			switch(data.action) {
				case 'auth':
					send.sessionId = env.sessionIdIndex++;
					env.sessions[send.sessionId] = {
						player: {
							x:0,
							y:0,
							size:1
						}
					};
				break;
				case 'getPlayerPositions':
					send.players={};
					for(session in env.sessions) {
						send.players[session]={
							x: env.sessions[session].player.x,
							y: env.sessions[session].player.y,
							size: env.sessions[session].player.size
						};
					}
				break;
				case 'move':
					var speed = 5;
					switch(data.direction) {
						case 'up':
						env.sessions[data.sessionId].player.y+=speed;
						break;
						case 'down':
						env.sessions[data.sessionId].player.y-=speed;
						break;
						case 'left':
						env.sessions[data.sessionId].player.x-=speed;
						break;
						case 'right':
						env.sessions[data.sessionId].player.x+=speed;
						break;
					}
					send.x=env.sessions[data.sessionId].player.x;
					send.y=env.sessions[data.sessionId].player.y;
					for(session in env.sessions) {
						if(data.sessionId!=session) {
							if(hitboxCalc(env.sessions[data.sessionId].player,
								env.sessions[session].player)) {
								if(env.sessions[data.sessionId].player.size>env.sessions[session].player.size) {
									env.sessions[data.sessionId].player.size+=env.sessions[session].player.size;
									env.sessions[session].player.size=1;
									env.sessions[session].player.x=Math.floor((Math.random()*600-300)/5)*5;
									env.sessions[session].player.y=Math.floor((Math.random()*600-300)/5)*5;
								} else {
									env.sessions[session].player.size+=env.sessions[data.sessionId].player.size;
									env.sessions[data.sessionId].player.size=1;
									env.sessions[data.sessionId].player.x=Math.floor((Math.random()*600-300)/5)*5;
									env.sessions[data.sessionId].player.y=Math.floor((Math.random()*600-300)/5)*5;
								}
							}	
						}
					}
				break;
				default:
				break;
			}
			response.end(JSON.stringify(send));
		});
	}
	// --- //
	var uri = url.parse(request.url).pathname;
    if (path.normalize(decodeURI(uri)) !== decodeURI(uri)) {
        response.statusCode = 403;
        response.end();
        return;
    }
	var filename = path.join(process.cwd(), uri);
	if(request.method == 'GET') {
		fs.exists(filename, function(exists) {
			if(!exists) {
				response.writeHead(404, {"Content-Type": "text/plain"});
				response.write("404 Not Found\n");
				response.end();
				return;
			}
			if (fs.statSync(filename).isDirectory()) filename += '/index.html';
			fs.readFile(filename, "binary", function(err, file) {
				if(err) {        
					response.writeHead(500, {"Content-Type": "text/plain"});
					response.write(err + "\n");
					response.end();
					return;
				}
				response.writeHead(200);
				response.end(file, 'binary');
			});
		});
	}
});
function hitboxCalc(player1, player2) {
	var xDistance = Math.abs(player1.x-player2.x);
	var yDistance = Math.abs(player1.y-player2.y);
	var minDistance = (player1.size+player2.size)/2;
	if(xDistance<minDistance&&yDistance<minDistance) return true;
	if(player1.x==player2.x&&player1.y==player2.y) return true;
	return false;
}
server.listen(8080);
