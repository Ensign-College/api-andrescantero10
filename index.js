const express = require("express");
const cors = require("cors");
const fs = require("fs");
const Redis = require("redis");
const bodyParser = require("body-parser");
const Ajv = require("ajv");
const { addOrder, getOrder } = require("./orderservice.js");
const { addOrderItem, getOrderItem } = require("./orderItems.js");

const Schema = JSON.parse(fs.readFileSync("./orderItemSchema.json", "utf-8"));
const ajv = new Ajv();

const redisClient = Redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:6379`,
});

exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Lambda!" }),
  };
  }
  // await redisClient.connect(); // Connect to Redis

  // try {
  //   switch (event.path) {
  //     case "/customers":
  //       if (event.httpMethod === "POST") {
  //         // Handle POST /customers
  //         return await handlePostCustomers(event);
  //       } else if (event.httpMethod === "GET") {
  //         // Handle GET /customers
  //         return await handleGetCustomers(event);
  //       }
  //       break;
  //     case event.path.match(/^\/customers\/\w+$/) && event.path:
  //       if (event.httpMethod === "GET") {
  //         // Handle GET /customers/:phoneNumber
  //         return await handleGetCustomerByPhoneNumber(event);
  //       }
  //       break;
  //     case "/orders":
  //       if (event.httpMethod === "POST") {
  //         // Handle POST /orders
  //         return await handlePostOrders(event);
  //       }
  //       break;
  //     case event.path.match(/^\/orders\/\w+$/) && event.path:
  //       if (event.httpMethod === "GET") {
  //         // Handle GET /orders/:orderId
  //         return await handleGetOrderByOrderId(event);
  //       }
  //       break;
  //     case "/orderItems":
  //       if (event.httpMethod === "POST") {
  //         // Handle POST /orderItems
  //         return await handlePostOrderItems(event);
  //       }
  //       break;
  //     case event.path.match(/^\/orderItems\/\w+$/) && event.path:
  //       if (event.httpMethod === "GET") {
  //         // Handle GET /orderItems/:orderItemId
  //         return await handleGetOrderItemByOrderItemId(event);
  //       }
  //       break;
  //     default:
  //       return {
  //         statusCode: 404,
  //         body: "Endpoint not found",
  //       };
  //   }
  // } catch (error) {
  //   console.error("Error:", error);
  //   return {
  //     statusCode: 500,
  //     body: "Internal Server Error",
  //   };
  // } finally {
  //   await redisClient.disconnect();
  // }
};

async function handlePostCustomers(event) {
  const { firstName, lastName, phoneNumber } = JSON.parse(event.body);
  if (!firstName || !lastName || !phoneNumber) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing required customer information.",
      }),
    };
  }
  const customerKey = `customer:${phoneNumber}`;
  const existingCustomer = await redisClient.json.get(customerKey, "$");
  if (existingCustomer) {
    return {
      statusCode: 409,
      body: JSON.stringify({ message: "Customer already exists." }),
    };
  }
  await redisClient.json.set(customerKey, "$", {
    firstName,
    lastName,
    phoneNumber,
  });
  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Customer created successfully.",
      firstName,
      lastName,
      phoneNumber,
    }),
  };
}
async function handleGetCustomers(event) {
  const customerKeys = await redisClient.keys("customer:*");
  const customers = await Promise.all(
    customerKeys.map(
      async (key) => await redisClient.json.get(key, { path: "$" })
    )
  );
  return {
    statusCode: 200,
    body: JSON.stringify(customers),
  };
}
async function handleGetCustomerByPhoneNumber(event) {
  const phoneNumber = event.pathParameters.phoneNumber;
  const customerKey = `customer:${phoneNumber}`;
  const customer = await redisClient.json.get(customerKey, "$");
  if (!customer) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Customer not found." }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(customer),
  };
}
async function handlePostOrders(event) {
  const order = JSON.parse(event.body);
  if (!order.orderId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing order ID." }),
    };
  }
  const orderKey = `order:${order.orderId}`;
  await redisClient.json.set(orderKey, "$", order);
  return {
    statusCode: 201,
    body: JSON.stringify({ message: "Order created successfully.", order }),
  };
}
async function handleGetOrderByOrderId(event) {
  const orderId = event.pathParameters.orderId;
  const orderKey = `order:${orderId}`;
  const order = await redisClient.json.get(orderKey, "$");
  if (!order) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Order not found." }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(order),
  };
}
async function handlePostOrderItems(event) {
  const orderItem = JSON.parse(event.body);
  const validate = ajv.compile(Schema);
  if (!validate(orderItem)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid order item data.",
        errors: validate.errors,
      }),
    };
  }
  // Assuming addOrderItem function returns an ID or similar identifier for the new order item
  const orderItemId = await addOrderItem({ redisClient, orderItem });
  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Order item added successfully.",
      orderItemId,
    }),
  };
}
async function handleGetOrderItemByOrderItemId(event) {
  const orderItemId = event.pathParameters.orderItemId;
  const orderItem = await getOrderItem({ redisClient, orderItemId });
  if (!orderItem) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Order item not found." }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(orderItem),
  };
}

// Implement other handler functions similarly

// const app = express(); //creates an express application
// const port = 3001; //port #
// // enabling CORS for any unknown origin(https://xyz.example.com)
// app.use(cors());
// app.use(bodyParser.json()); // use bodyParser

// app.listen(port, () => {
//   console.log(`API is Listening on port: ${port}`);
//   redisClient.connect(); // this connects the redis database!
// }); //listens for web requests from the frontend and don't stop

// app.get("/boxes", async (req, res) => {
//   let boxes = await redisClient.json.get("boxes", { path: "$" }); // get the boxes
//   //send the boxes to the browser
//   console.log(boxes);
//   res.json(boxes[0]); //convert boxes to a JSON string
// });

// app.post("/boxes", async (req, res) => {
//   const newBox = req.body;
//   newBox.id = parseInt(await redisClient.json.arrLen("boxex", "$")) + 1; // id set on user prompt
//   await redisClient.json.arrAppend("boxes", "$", newBox); // saves the JSON in redis
//   res.json(newBox); //respond with something, in this case, the newBox
// });

// //hw
// app.post("/customers", async (req, res) => {
//   const { firstName, lastName, phoneNumber } = req.body; // Destructure customerId and name from the request body
//   if (!firstName || !lastName) {
//     return res.status(400).send("Customer ID and name are required."); // If either customerId or name is not provided, send 400 Bad Request response
//   }
//   const user = {
//     //Descibes User's Characteristics
//     firstName,
//     lastName,
//     phoneNumber,
//   };
//   const customerKey = `customer:${user.phoneNumber}`; // Construct the Redis key for the customer using customerId

//   const existingCustomer = await redisClient.json.get(customerKey, "$"); // Check if the customer already exists to avoid overwriting existing data

//   if (existingCustomer) {
//     return res
//       .status(409)
//       .send(`Customer with ID ${customerId} already exists.`); // If the customer already exists, send a 409 Conflict response
//   }

//   await redisClient.json.set(customerKey, "$", user); // Save the customer data as a JSON object in Redis

//   res.status(201).json(user); // Respond with the saved customer data
// });

// app.get("/customers", async (req, res) => {
//   try {
//     const customerKeys = await redisClient.keys("customer:*"); // Gets the Users
//     const customers = await Promise.all(
//       customerKeys.map(async (key) => {
//         const customers = await redisClient.json.get(key, { path: "$" }); // Get the customer data from Redis
//         return customers;
//       })
//     );

//     res.json(customers); // Send all customers as JSON
//   } catch (error) {
//     console.error("Failed to fetch customers:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });
// app.get("/customers/:phoneNumber", async (req, res) => {
//     const customerKey = `customer:${req.params.phoneNumber}`; // Construct the Redis key for the customer using customerId

//     try {
//         const customer = await redisClient.json.get(customerKey, { path: "$" }); // Get the customer data from Redis
//         if (customer) {
//         res.json(customer); // Send the customer as JSON
//         } else {
//         res.status(404).send("Customer not found"); // Send a 404 Not Found response if the customer does not exist
//         }
//     } catch (error) {
//         console.error("Failed to fetch customer:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });

// app.post("/orders", async (req, res) => {
//   const order = req.body; // Get the order object from the request body
//   const orderId = `order:${order.orderId}`; // Ensure this matches the saving key format

//   try {
//     // Saving the entire order object as a JSON in Redis
//     await redisClient.json.set(orderId, "$", order); // Save the order in Redis
//     res.status(201).send({ message: "Order saved successfully", order }); // Send a 201 Created response with the order ID
//   } catch (error) {
//     console.error("Failed to add order:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });

// app.get("/orders/:orderId", async (req, res) => {
//   const orderId = `order:${req.params.orderId}`; // Ensure this matches the saving key format

//   try {
//     const order = await redisClient.json.get(orderId, { path: "$" }); // Retrieve the order from Redis
//     if (order) {
//       res.json(order); // Send the order as JSON
//     } else {
//       res.status(404).send("Order not found"); // Send a 404 Not Found response if the order does not exist
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error"); // Send a 500 Internal Server Error response if an error occurs
//   }
// });
// app.post("/orderItems", async (req, res) => {
//   try {
//     console.log("Schema", Schema); // Log the schema to the console
//     const validate = ajv.compile(Schema); // Compile the schema into a validation function
//     const valid = validate(req.body); // Validate the request body against the schema
//     if (!valid) {
//       return res.status(400).json({ error: "Invalid request body" }); // Send a 400 Bad Request response if the request body is invalid
//     }
//     console.log("Request body:", req.body);

//     const orderItemId = await addOrderItem({
//       redisClient,
//       orderItem: req.body,
//     });
//     res
//       .status(201)
//       .json({ orderItemId, message: "Order item added successfully" }); // Send a 201 Created response with the generated order item ID
//   } catch (error) {
//     console.error("Failed to add order item:", error); // Log the error to the console
//     res.status(500).json({ error: "Internal Server Error" }); // Send a 500 Internal Server Error response
//   }
// });
// app.get("/orderItems/:orderItemId", async (req, res) => {
//   try {
//     const orderItemId = req.params.orderItemId; // Get the order item ID from the request parameters
//     const orderItem = await getOrderItem({ redisClient, orderItemId }); // Retrieve the order item from Redis
//     res.json(orderItem); // Send the order item as JSON
//   } catch (error) {
//     console.error("Failed to fetch order item:", error); // Log the error to the console
//     res.status(500).json({ error: "Internal Server Error" }); // Send a 500 Internal Server Error response
//   }
// });

console.log("Hello");
