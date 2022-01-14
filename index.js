// import the variables and function from module.js
const express= require('express');
const cors=require('cors');
const pass='cIu12345';
const fileUpload=require('express-fileupload');
const utilsFunc=require("./utilites");
const { MongoClient } = require('mongodb');
const fs=require('fs-extra');


const uri = "mongodb+srv://ciu-app-db:cIu12345@cluster0.xmdkt.mongodb.net/ciu-app?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('students'));
app.use(express.static('compressImage'));
app.use(fileUpload());


app.get('/',(req,res)=>{
    res.send("hello world");
})


client.connect(err => {
    const user_collection = client.db("ciu-app").collection("users");
    const students_collection = client.db("ciu-app").collection("students");
    const teachers_collection = client.db("ciu-app").collection("teachers");
    const courses_collection = client.db("ciu-app").collection("courses");
    const admins_collection = client.db("ciu-app").collection("admins");

    app.post('/offerlist',(req,res)=>{
        console.log(req.body);
    })

    app.post("/addStudent",(req, res) => {
      // const {id}=req.body.name;
      const file=req.files.file;
      const data=req.body.data;
      const path=`${__dirname}/students/${file.name}`;
      const outputPath=`${__dirname}/compressImage/`;

      const dataObj=JSON.parse(data);
      console.log(file, dataObj);
      file.mv(path,error => {
        if(error){
          console.log("error: "+error);
        }
        const newImg=fs.readFileSync(path);
        const encImg=newImg.toString('base64');
        const image={
          contentType: file.mimetype,
          img: encImg,
          size: file.size
        }
        utilsFunc.compImg(path,outputPath);
        dataObj.img=image;
        // console.log(dataObj);
        students_collection.insertOne(dataObj)
        .then(result=>{
          // fs.remove(path);
          res.send(result.insertedCount > 0);
        })
        
      })
    });

    app.post("/addTeacher",(req,res)=>{
      const file=req.files.file;
      const data =req.body.data;
      console.log(file,data);
      res.send("click");
    })

    app.get('/allStudents',(req,res)=>{
      students_collection.find({})
      .then(result=>{
        console.log(result);
      })
    })
    
});


app.listen(5000,()=>{
    console.log("website is running 5000");
})