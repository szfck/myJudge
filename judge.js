#!/usr/bin/nodejs
optimist = require('optimist');
path = require('path')
fs = require('fs');

var ARGS = optimist.argv;
var source = ARGS["s"];
var problem_path = ARGS["p"];
var output = ARGS['v']
var time = ARGS['t']
var sub = ARGS['sub']
// judge 
//       -source       {user_submission_filename} 
//       -problem_path {problem_package_path} 
//       -verdict_path {verdict_path}
// opt   -timelimit {time_limit}
// opt   -subtask   {large/small/medium}


function has(str, sub) {
    return str.indexOf(sub) > -1;
}

function isDigit(ch) {
    return ch >= '0' && ch <= '9' || ch == '.';
}

function getTime(str) {
    var pos = str.indexOf('CPU:');
    while (!isDigit(str[pos])) pos++;
    var last = pos;
    while (isDigit(str[last])) last++;
    return str.substr(pos, last - pos);
}

function getFiles(dir, prefix) {
    var files = fs.readdirSync(dir);
    filelist = [];
    files.forEach(function(file) {
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            var prefixName;
            if (prefix == '') prefixName = file;
            else prefixName = prefix + '/' + file;
            filelist = filelist.concat(getFiles(dir + '/' + file, prefixName));
        }
        else {
            if (path.extname(file) == ".in") {
                filelist.push(prefix + '/' + file.replace(/\.[^/.]+$/, ""));
            }
            
        }
    });
    return filelist;
}

function getCompilerErrorMsg() {
    return "no error";
}
function toJsonResult(str) {

    var dataPath = problem_path + '/data';
    var fileList = getFiles(dataPath, '');

    res = {};
    
    if (has(str, "Compile error")) {
        res['verdict'] = 'CE';
        res['totalCases'] = fileList.length;
        res['compilationError'] = getCompilerErrorMsg();
        return res;
    }
    
    var pos = str.indexOf('[');
    var nxt = str.indexOf(']');
    pos -= 5;
    str = str.substr(pos, nxt - pos + 1);
    //console.log(str);
    

    if (has(str, "AC")) res['verdict'] = 'AC';
    else if (has(str, "TLE")) res['verdict'] = 'TLE';
    else if (has(str, "RTE")) res['verdict'] = 'RE';
    else {
        res['verdict'] = 'WA';
    }
    
    var verdict = res['verdict'];
    
    if (verdict == 'RE' || verdict == 'WA' || verdict == 'TLE') {
        var pos = str.indexOf('test case ') + 10;
        var tmpStr = str.substr(pos);
        pos = tmpStr.indexOf(',');
        var caseName = tmpStr.substr(0, pos);
        //console.log(caseName);
        var idx = fileList.indexOf(caseName);

        res['failedCase'] = {};
        res['failedCase']['number'] = idx + 1;
        res['failedCase']['name'] = caseName;
    }

    res['time'] = getTime(str);
    
    res['totalCases'] = fileList.length;

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
    
    var taskPath = problem_path;

    if (sub) {
        taskPath = taskPath + '/' + sub;
    }

    var tmpFileName = "tmptest" + path.extname(fileName);
    var tmpSubmission = taskPath + '/submissions/accepted/' + tmpFileName; 

    var contents = fs.readFileSync(source).toString();
    
    fs.writeFileSync(tmpSubmission, contents);

    var cmd_line = "verifyproblem " + taskPath + " -s " + "accepted/" + tmpFileName + " -p submissions";
    
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

