import express, { json } from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient } from "mongodb";
import Joi from "joi";
import dayjs from "dayjs";
import dotenv from "dotenv"

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db(process.env.BANCO_MANGO);
})
promise.catch(e => console.log("Deu ruim pra conectar no banco", e));

app.post("/participants", async (req, res) => {

    const { name } = req.body;

    const newParticipantSchema = Joi.object({
        name: Joi.string().required()
    })

    try {

        const participantExist = await db.collection("participants").findOne({ name });
        const validation = newParticipantSchema.validate({ name: name });
        console.log("validacao", participantExist)

        if (validation.error || participantExist != undefined) {
            res.status(409).send(validation.error)
            console.log(validation.error);
            return;
        }

        await db.collection("participants").insertOne(
            {
                name: name,
                lastStatus: Date.now()
            }
        )

        await db.collection("messages").insertOne(
            {
                from: validation.name,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs(Date.now()).format("HH:mm:ss"),
            }
        )

        res.sendStatus(201);

    } catch (e) {
        console.log(e);
        res.sendStatus(422);
    }
})

app.get("/participants", async (req, res) => {

    try {
        const allParticipants = await db.collection("participants").find({}).toArray();
        res.status(201).send(allParticipants)

    } catch (e) {
        console.error(error);
        res.sendStatus(500);
    }
})

app.post("/messages", async (req, res) => {

    const { to, text, type } = req.body;
    const from = req.header.user;

    const newMessageSchema = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid("message", "private_message").required(),
    })

    try {

        const participantExist = await db.collection("participants").findOne({ name: from })
        const validation = newMessageSchema.validate(req.body, { abortEarly: false });


        if (participantExist == undefined || validation.error) {

            res.status(409).send(validation.error);
            return;
        } else {

            await db.collection("messages").insertOne(
                {
                    from: participantExist.name,
                    to: to,
                    text: text,
                    type: type,
                    time: dayjs(Date.now()).format("HH:mm:ss")
                }
            );

            res.sendStatus(201);
            return;
        }

    } catch (e) {
        console.error(e);
        res.sendStatus(422);
        return;
    }
})

app.get("/messages", async (req, res) => {

    const { user } = req.headers
    const { limit } = req.query

    try {

        const allMessages = await db.collection("messages").find({
            $or: [
                { to: "Todos" },
                { to: user },
                { from: user },
                { tyoe: "message" },
            ],
        }).toArray()

        if (limit) {

            let limitedMessages = [...allMessages].reverse().slice(0, limit);
            res.status(200).send(limitedMessages.reverse());
            return;

        } else {

            res.status(200).send(allMessages);
            return;
        }

    } catch (e) {

        res.status(500).send(e);
        console.log(e);
        return;
    }
})

app.post("/status", async (req, res) => {
    const { user } = req.headers

    try {
        const allParticipants = db.collection("participants");
        const participant = await allParticipants.findOne({ user });

        if (!participant) {
            res.sendStatus(404);
            return;
        }

        await allParticipants.updateOne(
            { name: user },
            { $set: { lastStatus: Date.now() } }
        );

        res.sendStatus(200);
        return;

    } catch (e) {

        res.sendStatus(422);
        return;
    }
})

app.listen(3500, () => {
    console.log(chalk.bold.green(`Server is good to go`))
});