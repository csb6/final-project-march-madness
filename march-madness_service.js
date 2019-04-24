(function() {
    "use strict";
    const express = require("express");
    const app = express();
    const bodyParser = require("body-parser");
    const jsonParser = bodyParser.json();
    //Avoid CORS errors
    app.use(express.static("public"));
    app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers",
		   "Origin, X-Requested-With, Content-Type, Accept");
	next();
    });
    const fs = require("fs");
    const mysql = require("mysql");
    //mysql://b36475d0fffd42:ed4df197@us-cdbr-iron-east-02.cleardb.net/heroku_773aec2ba21032d?reconnect=true
    /*let connection = mysql.createConnection({
        host: "localhost",
        database: "march_madness",
        user: "root",
        password: "Orange-Spheres7!",
        debug: "true"
	});*/
    let connection = mysql.createConnection({
        host: "us-cdbr-iron-east-02.cleardb.net",
        database: "heroku_773aec2ba21032d",
        user: "b36475d0fffd42",
        password: "ed4df197",
    });

    function sendPlayerStats(connection, res, teamId) {
        connection.query("SELECT players.name, class, position, hometown, high_school "+
                         "FROM players JOIN teams ON teams.id = players.team_id "+
                         "WHERE teams.id = "+teamId,
                         function(err, result, fields){
                             if(err) throw err;
                             res.send(result);
                         });
    }

    connection.connect(function() {
        app.get('/', function(req, res){
            res.header("Access-Control-Allow-Origin", "*");
            if(req.query.mode === "initial-matchups") {
                let initialMatchups = JSON.parse(fs.readFileSync("initial-matchups.json", "utf8"));
                res.send(JSON.stringify(initialMatchups));
            } else if(req.query.mode === "stat") {
                console.log(req.query);
                connection.query("SELECT name FROM team_stats "+
                                 "JOIN teams ON teams.id = team_stats.team_id "+
                                 "WHERE name='"+req.query.name1+"' "+
                                 "OR name='"+req.query.name2+
                                 "' ORDER BY team_stats."+req.query.stat+" DESC LIMIT 1",
                                 function(err, result, fields) {
                                     if(err) throw err;
                                     res.send(JSON.stringify(result));
                                 });

            } else if(req.query.mode === "full-bracket") {
                let fullBracket = JSON.parse(fs.readFileSync("../matchups.json", "utf8"));
                res.send(JSON.stringify(fullBracket));
            } else if(req.query.mode === "team") {
                let teamName = req.query.name;
                connection.query("SELECT id FROM teams WHERE name = "+
                                 connection.escape(teamName), function(err, result, fields) {
                                     if(err) throw err;
				     if(result[0]) {
					 //If team id found, find team's player stats 
					 let teamId = result[0].id;
					 sendPlayerStats(connection, res, teamId);
				     } else {
					 //Tell client that the teamname not found
					 res.sendStatus(404);
				     }
                                 });
            } else if(req.query.mode === "load-user") {
		let userStat = fs.readFile("../user-brackets/"+req.query.name+".json", function(err, data) {
		    if(err) {
			//Tell client if user's bracket not found
			res.sendStatus(404);
		    } else {
			//If found, send the bracket to the user
			res.send(JSON.stringify(data));
		    }
		});
		res.send(userStat);
	    }
        });
	
	app.post('/', jsonParser, function(req, res) {
	    res.header("Access-Control-Allow-Origin", "*");
	    let userStat = req.body.stat;
	    fs.writeFile("../user-brackets/"+req.body.name+".json", userStat, function(err) {
		if(err) {
		    //Bracket saved correctly
		    res.sendStatus(500);
		} else {
		    //Bracket failed to save correctly
		    res.sendStatus(200);
		}
	    });
	});
	
    });
    app.listen(process.env.PORT || 3000);
})();
