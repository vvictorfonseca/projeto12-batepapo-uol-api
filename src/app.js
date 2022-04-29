import express from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient } from "mongodb";

import schema from "./schema.js";

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
const mongoClient = new MongoClient("mongodb://127.0.0.1:27017");

app.post("/participants", async (req, res) => {

    const { name } = req.body;

    try {
        await mongoClient.connect();
        db = mongoClient.db(chat-uol);

        const allParticipants = await db.collection("participants").find({}).toArray();
        const participantExist = allParticipants.find((participant) => participant.name === name);
        const nameValidation = schema.validate({ name:name });

        if(participantExist != undefined){
            res.sendStatus(409);
            mongoClient.close();
            return;
        }

        if(nameValidation && participantExist == undefined){

            await db.collection("participants").insertOne({
                name: nameValidation.name,
                lastStatus: Date.now()
            });

            await db.collection("messages").insertOne({
                from: nameValidation.name,
                to: "Todos",
                text: "Entrou na sala...",
                type: "Status",
                time: dayjs(Date.now()).format("HH:MM:SS")
            });

            res.sendStatus(201);
            mongoClient.close();
        }
    }catch (e){
        console.error(error);
        res.sendStatus(422);
        mongoClient.close()
    }
})

app.get("/participants", async (res,req) =>{

    try{
        await mongoClient.connect();
        db = mongoClient.db(chat-uol);

        const allParticipants = await db.collection("participants").find({}).toArray();
        res.send(allParticipants);

        mongoClient.close()
    
    } catch (e){
        console.error(error);
        res.sendStatus(500);
        mongoClient.close()
    }
})

app.post("/messages", async (res,req) =>{

    const { to, text, type } = req.body;
    const from = req.header.user;

    try{

        await mongoClient.connect();
        db = mongoClient.db(chat-uol)

        const allParticipants = await db.collection("participants").find({}).toArray();
        const participantExist = allParticipants.find((participant) => participant.user === from);
    
        const toAndTextValid = schema.validate({
            to: to,
            text: text
        })
        const typeValid = schema.validate({ type:type })

        if (toAndTextValid && typeValid && participantExist){

            await db.collection("messages").insertOne(
                {
                    to: toAndTextValid.to,
                    text: toAndTextValid.text,
                    type: typeValid.type
                }
            );

            res.sendStatus(201)
            mongoClient.close()
        }

    } catch (e){
        
        console.error(error);
        res.sendStatus(422);
        mongoClient.close();
    }
})

app.listen(5000, () => {
    console.log(chalk.bold.green(`Server is good to go`))
});