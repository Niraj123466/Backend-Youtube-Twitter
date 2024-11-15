# we have to use following middleware
- To resolve the cors issue 
app.use(cors({
    origin : "*",
    crediatials : true
}))

- To parse the json data in body
app.use(express.json())

-To parse url app.use(urlencoded())

- To handle the coockies app.use(coockieParser())

- to serve statu assets
app.use(express.static('public'))# Backend-Youtube-Twitter
