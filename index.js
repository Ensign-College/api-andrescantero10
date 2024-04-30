// const fs = require("fs");
const Redis = require("redis");
// const bodyParser = require("body-parser");
// const Ajv = require("ajv");
// const { addOrder, getOrder } = require("./orderservice.js");
// const { addOrderItem, getOrderItem } = require("./orderItems.js");

// const Schema = JSON.parse(fs.readFileSync("./orderItemSchema.json", "utf-8"));
// const ajv = new Ajv();

let redisClient;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = Redis.createClient({
      url: `redis://${process.env.REDIS_HOST}:6379`,
    });
    await redisClient.connect();
  } else if (!redisClient.isOpen) {
    // Reconnect if the client is not open
    await redisClient.connect();
  }
  return redisClient;
}

exports.handler = async (event) => {
  const client = await getRedisClient();

  const { httpMethod, path } = event; // Extract the HTTP method and path from the event
  event.redisClient = redisClient;
  if (path === "/customers" && httpMethod === "GET") { // Check if the path is /customers and the HTTP method is GET
    return await handleGetCustomers(event); // Call the handleGetCustomers function
  } else if (path === "/customers" && httpMethod === "POST") { // Check if the path is /customers and the HTTP method is POST
    return await handlePostCustomers(event); // Call the handlePostCustomers function
  } else if (path.match(/^\/customers\/\w+$/) && httpMethod === "GET") { // Check if the path matches /customers/{phoneNumber} and the HTTP method is GET
    return await handleGetCustomerByPhoneNumber(event); // Call the handleGetCustomerByPhoneNumber function
  }
  //
  else if (path === "/orders" && httpMethod === "POST") {
    return await handlePostOrders(event);
  } else if (path === "/orders" && httpMethod === "GET") {
    return await handleGetOrders(event);
  } else if (path.match(/^\/orders\/\w+$/) && httpMethod === "GET") { // Check if the path matches /orders/{orderId} and the HTTP method is GET
    return await handleGetOrderByOrderId(event);
  } else if (path === "/orderItems" && httpMethod === "POST") {
    return await handlePostOrderItems(event);
  } else if (path === "/orderItems" && httpMethod === "GET") {
    return await handleGetOrderItems(event);
  } else if (path.match(/^\/orderItems\/\w+$/) && httpMethod === "GET") {
    return await handleGetOrderItemByOrderItemId(event);
  } else {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }
};

async function handlePostCustomers(event) {
  const { firstName, lastName, phoneNumber } = JSON.parse(event.body); // Extract the firstName, lastName, and phoneNumber from the request body
  if (!firstName || !lastName || !phoneNumber) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing required customer information.",
      }),
    };
  }
  const customerKey = `customer:${phoneNumber}`;
  const existingCustomer = await redisClient.json.get(customerKey, "$"); // Check if a customer with the given phone number already exists
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
  const customerKeys = await redisClient.keys("customer:*"); // Get all keys that match the pattern "customer:*"
  const customers = await Promise.all(
    customerKeys.map(
      async (key) => await redisClient.json.get(key, { path: "$" }) // Get the value of each key
    )
  );
  return {
    statusCode: 200,
    body: JSON.stringify(customers),
  };
}
async function handleGetCustomerByPhoneNumber(event) {
  const phoneNumber = event.pathParameters.phoneNumber; // Extract the phone number from the path parameters
  const customerKey = `customer:${phoneNumber}`;
  const customer = await redisClient.json.get(customerKey, "$"); // Get the customer with the given phone number
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
  const orderKey = `order:${orderId}`; // Create the key for the order
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
