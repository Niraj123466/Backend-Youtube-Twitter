import express, { urlencoded } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({  // to solve the cors issue
    origin : process.env.CORS_ORIGIN,
    credentials :true
}))
// to parse the json data
app.use(express.json({
    limit : "16kb"
}))
// to parse the data from url
app.use(urlencoded({
    extended : true,
    limit : "16kb"
}))
// to store the static assets like pdf,images,etc. 
app.use(express.static("public"))
app.use(cookieParser())

// import router
import userRouter from "./routes/user.routes.js"

app.use("/api/v1/users", userRouter)

export {app}