const express = require('express');

const app = express();
app.listen(3000);


const boxes = [
    {boxId:1},
    {boxId:2},
    {boxId:3},
    {boxId:4},
];
app.get('/boxes', (req,res)=>{
    res.send(JSON.stringify(boxes));
});


console.log("hello");