const express = require('express');
const Redis = require('redis'); //Import Redis Class from the Library
const bodyParser = require('body-parser');

//import express from 'express'
const redisClient = Redis.createClient({
    url:`redis://localhost:6379`
});
const app = express(); //creates an express application
const port = 3000; //port #

app.use(bodyParser.json()); // use bodyParser

app.listen(port,()=>{
    console.log(`API is Listening on port: ${port}`);
    redisClient.connect(); // this connects the redis database!
}); //listens for web requests from the frontend and don't stop


app.get('/boxes',async (req,res)=>{
    let boxes = await redisClient.json.get('boxes',{path:'$'});// get the boxes
    //send the boxes to the browser
    res.json(boxes);//convert boxes to a JSON string
});

app.post('/boxes', async (req, res) => {
    const newBox = req.body;
    newBox.id =  parseInt(await redisClient.json.arrLen('boxex','$'))+1; // id set on user prompt
    await redisClient.json.arrAppend('boxes', '$', newBox); // saves the JSON in redis
    res.json(newBox); //respond with something, in this case, the newBox

 });

console.log("hello");