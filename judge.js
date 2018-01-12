#!/usr/bin/nodejs
optimist = require('optimist');

fs = require('fs');

var ARGS = optimist.argv;
var source = ARGS["s"];
var problem_path = ARGS["p"];
var output = ARGS['v']
var time = ARGS['t']
// judge 
//       -source       {user_submission_filename} 
//       -problem_path {problem_package_path} 
//       -verdict_path {verdict_path}
// opt   -timelimit {time_limit}
function has(str, sub) {
    return str.indexOf(sub) > -1;
}

function toJsonResult(str) {
    res = {};

    if (has(str, "OK: AC")) res['verdict'] = 'AC';
    else if (has(str, "WA")) res['verdict'] = 'WA';
    else if (has(str, "TLE")) res['verdict'] = 'TLE';
    else if (has(str, "Compile error")) res['verdict'] = 'CE';
    else if (has(str, "RTE")) res['verdict'] = 'RE';
    
    return res;
}

if (!source) {
    console.log("Hey, you need -s {user_submission_filename}");
} else if (!problem_path) {
    console.log("Hey, you need -p {problem_package_path}");
} else if (!output) {
    console.log("Hey, you need -v {verdict_path}");
} else {
    var pos = source.lastIndexOf("/");
    var userPath = source.substr(0, pos);
    var fileName = source.substr(pos + 1);

    var exec = require('child_process').exec;

    var tmpSubmission = problem_path + '/submissions/accepted/' + fileName; 

    var contents = fs.readFileSync(source).toString();
    
    fs.writeFileSync(tmpSubmission, contents);

    var cmd_line = "verifyproblem " + problem_path + " -s " + "accepted/" + fileName + " -p submissions";
    
    if (time) {
        cmd_line = cmd_line + " -t " + time;
    }

    console.log(cmd_line);

    

    exec(cmd_line, function(err,stdout,stderr){
        console.log(toJsonResult(stdout));
        // delete file
        fs.unlinkSync(tmpSubmission);
        
    });

}

