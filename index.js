const express = require('express');
const Redis = require('redis'); //Import Redis Class from the Library
const bodyParser = require('body-parser');
const cors = require('cors') 
  
  


//import express from 'express'
const redisClient = Redis.createClient({
    url:`redis://localhost:6379`
});
const app = express(); //creates an express application
const port = 3001; //port #
// enabling CORS for any unknown origin(https://xyz.example.com) 
app.use(cors());
app.use(bodyParser.json()); // use bodyParser

app.listen(port,()=>{
    console.log(`API is Listening on port: ${port}`);
    redisClient.connect(); // this connects the redis database!
}); //listens for web requests from the frontend and don't stop


app.get('/boxes',async (req,res)=>{
    let boxes = await redisClient.json.get('boxes',{path:'$'});// get the boxes
    //send the boxes to the browser
    console.log(boxes)
    res.json(boxes[0]);//convert boxes to a JSON string
});

app.post('/boxes', async (req, res) => {
    const newBox = req.body;
    newBox.id =  parseInt(await redisClient.json.arrLen('boxex','$'))+1; // id set on user prompt
    await redisClient.json.arrAppend('boxes', '$', newBox); // saves the JSON in redis
    res.json(newBox); //respond with something, in this case, the newBox

 });

//hw
 app.post('/customers', async (req, res) => {
    const { customerId, name } = req.body; // Destructure customerId and name from the request body
    
    if (!customerId || !name) {
        return res.status(400).send("Customer ID and name are required.");// If either customerId or name is not provided, send 400 Bad Request response

    }
    
    const customerKey = `customer:${customerId}`; // Construct the Redis key for the customer using customerId

    const customerData = { customerId, name };

    const existingCustomer = await redisClient.json.get(customerKey, '$');// Check if the customer already exists to avoid overwriting existing data

    if (existingCustomer) {
        return res.status(409).send(`Customer with ID ${customerId} already exists.`);// If the customer already exists, send a 409 Conflict response

    }

    await redisClient.json.set(customerKey, '$', customerData);// Save the customer data as a JSON object in Redis


    res.status(201).json(customerData);// Respond with the saved customer data

});

app.get('/customers', async (req, res) => {
    try {
        const customerKeys = await redisClient.keys('customer:*');
        const customers = await Promise.all(customerKeys.map(async (key) => {
            const customerData = await redisClient.json.get(key, {path: '$'});
            return customerData;
        }));

        res.json(customers); // Send all customers as JSON
    } catch (error) {
        console.error('Failed to fetch customers:', error);
        res.status(500).send('Internal Server Error');
    }
});

console.log("Hello");