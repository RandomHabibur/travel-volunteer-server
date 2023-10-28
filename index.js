const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors({ origin: "*" }));
// body parser
app.use(express.json());

// MongoDB user name & password from dotenv
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASS = process.env.DB_PASS;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

const uri = `mongodb+srv://${DB_USERNAME}:${DB_PASS}@cluster0.sfigf7b.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access 1" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access 2" });
    }
    req.decoded = decoded;
    next();
  });
  console.log(authorization);
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // jwt token secret
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      console.log(user, token);
      res.send({ token });
    });

    app.get("/", (req, res) => {
      res.send("Travel Volunteer server is running");
    });
    // create a database
    const EventsCollection = client.db("eventCollection").collection("events");
    const VolunteersCollection = client
      .db("eventCollection")
      .collection("volunteers");
    // perform actions on the collection

    // get events dat from database
    // app.get("/events", async (req, res) => {
    //   const result = await EventsCollection.find().toArray();
    //   res.send(result);
    // });
    // filter events by email

    // add pagination for events

    app.get("/events", async (req, res) => {
      const email = req.query.email;
      // console.log("user email", email);

      // const result = await EventsCollection.find({ email }).toArray();
      const filterByEmail = await EventsCollection.find({ email }).toArray();
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.perPage) || 10;
      console.log(page, perPage);
      const skip = (page - 1) * perPage;
      const result = await EventsCollection.find()
        .skip(skip)
        .limit(perPage)
        .toArray();
      // res.send({ result, filterByEmail });
      res.send(result);
    });
    // get single event data by id

    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { eventTitle: 1, bannerImage: 1 },
      };
      const result = await EventsCollection.findOne(query, options);

      res.send(result);
    });

    // add new event
    app.post("/events", async (req, res) => {
      const event = req.body;
      console.log(event);
      const result = await EventsCollection.insertOne(event);
      res.send(result);
    });
    // get applyed volunteers list

    app.get("/volunteers", verifyJWT, async (req, res) => {
      console.log(req.headers.authorization);
      const decoded = req.decoded;

      const userNameOrEmail = req.query?.email;
      console.log("comeback after decoded", decoded, userNameOrEmail);
      if (decoded.email !== userNameOrEmail) {
        return res
          .status(403)
          .send({ error: true, message: "unauthorized access" });
      }
      console.log(userNameOrEmail);
      const filterByEmail = await VolunteersCollection.find({
        userNameOrEmail,
      }).toArray();
      res.send(filterByEmail);
    });

    // get all volunteer list for admin page
    app.get("/allVolunteers", async (req, res) => {
      const rsult = await VolunteersCollection.find().toArray();
      res.send(rsult);
    });
    // apply for event voluntership
    app.post("/volunteers", async (req, res) => {
      const volunteer = req.body;
      const result = await VolunteersCollection.insertOne(volunteer);
      console.log(volunteer);
      res.send(result);
    });
    // delete a volunteer request
    app.delete("/volunteers/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await VolunteersCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();`
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
