#!/usr/bin/nodejs
optimist = require('optimist');
path = require('path')
fs = require('fs');
exec = require('child_process').exec;

var ARGS = optimist.argv;
var source = ARGS.source;
var problem_path = ARGS.problem;
var output = ARGS.output;
var time = ARGS.time;
var sub = ARGS.subtask;



// judge 
//       -source       {user_submission_filename} 
//       -problem_path {problem_package_path} 
//       -verdict_path {verdict_path}
// opt   -timelimit {time_limit}
// opt   -subtask   {large/small/medium}
/*
console.log(source);
console.log(problem_path);
console.log(output);
console.log(time);
console.log(sub);
*/
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



// function getCompilerErrorMsg(tmpSubmission) {
//     var extension = path.extname(tmpSubmission);
//     var child_process = require("child_process");

//     //console.log(tmpSubmission);
//     //console.log("extension: " + extension);
//     if (extension == '.java') {
//         var cmd_line = "javac " + tmpSubmission;
//         exec(cmd_line, function(err,stdout,stderr){
//             console.log(stderr);
//         });
//     } else if (extension == '.c') {
    
//     } else if (extension == '.cpp') {

//     } else if (extension == '.py') {

//     } else {
//      return "not find such file extension compiler";
//     }
// }

function toJsonResult(str, tmpSubmission) {
    //console.log(str);
    var dataPath = problem_path + '/data';
    var fileList = getFiles(dataPath, '');

    res = {};

    //Compile error
    if (has(str, "Compile error")) {
        res['verdict'] = 'CE';
        res['totalCases'] = fileList.length;
        //console.log("errrrror");
        //console.log(getCompilerErrorMsg(tmpSubmission));
        
        //var str = getCompilerErrorMsg(tmpSubmission);
        res['compilationError'] = 'not implemented yet';
        return res;
    }
    
    //others
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

function changeJavaClass(contents, name) {
    //console.log(contents);
    contents = ''+contents.replace(/ +(?= )/g,'')

    var pos = contents.indexOf('public class ');
    pos += 'public class '.length;
    var nxt = contents.indexOf('{', pos);
    contents = contents.substr(0, pos) + name + contents.substr(nxt);
    return contents;
}

if (!source) {
    console.log("Hey, you need -s {user_submission_filename}");
} else if (!problem_path) {
    console.log("Hey, you need -p {problem_package_path}");
} else if (!output) {
    console.log("Hey, you need -v {verdict_path}");
} else {
    if (sub) {
        problem_path = problem_path + '/' + sub;
    }

    var pos = source.lastIndexOf("/");
    var userPath = source.substr(0, pos);
    var fileName = source.substr(pos + 1);

    
    
    var testName = "TTMMPPTest";
    
    var tmpFileName = testName + path.extname(fileName);
    var tmpSubmission = problem_path + '/submissions/accepted/' + tmpFileName; 

    var contents = fs.readFileSync(source).toString();
    
    if (path.extname(fileName) == '.java') {
        contents = changeJavaClass(contents, testName);
    }

    fs.writeFileSync(tmpSubmission, contents);

    var cmd_line = "verifyproblem " + problem_path + " -s " + "accepted/" + tmpFileName + " -p submissions";
    
    //console.log(cmd_line);
    if (time) {
        cmd_line = cmd_line + " -t " + time;
    }

    //console.log(cmd_line);

    exec(cmd_line, function(err,stdout,stderr){
        console.log(toJsonResult(stdout, tmpSubmission));
        // delete file
        fs.unlinkSync(tmpSubmission);
    });

}

