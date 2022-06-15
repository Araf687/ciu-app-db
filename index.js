// import the variables and function from module.js
const express= require('express');
const cors=require('cors');
const xlsx=require('xlsx');
const pass='cIu12345';
const fileUpload=require('express-fileupload');
const { MongoClient } = require('mongodb');
const util = require("./util");
const { json } = require('body-parser');
const { type } = require('express/lib/response');


const uri = "mongodb+srv://ciu-app-db:cIu12345@cluster0.xmdkt.mongodb.net/ciu-app?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('students'));
app.use(express.static('compressImage'));
app.use(fileUpload());


app.get('/',(req,res)=>{
    
    const array=["CSE101","CSE101L","CSE201L","CSE340","CSE401L","CSE498"];
    const x=util.countCredit(array);
    console.log(x);
    res.send("hello world. The credits count is: ");

})


client.connect(err => {
    const user_collection = client.db("ciu-app").collection("users");
    const students_collection = client.db("ciu-app").collection("students");
    const teachers_collection = client.db("ciu-app").collection("teachers");
    const events_collection = client.db("ciu-app").collection("events");
    const courses_collection = client.db("ciu-app").collection("courses");
    const stCourseCompletion_collection = client.db("ciu-app").collection("st_course_comlepetion_info");
    const admins_collection = client.db("ciu-app").collection("admins");
    const customiseList_collection=client.db("ciu-app").collection("customized_list");
    const rooms_collection=client.db("ciu-app").collection("class_rooms");
    const routine_collection=client.db("ciu-app").collection("Routine");
    const extra=client.db("ciu-app").collection("extra");

    app.post('/addAdvisingList',(req,res)=>{
        const previousAdvingData=req.body.completionObjectArray;
        const optionalCourses=req.body.electiveCourseArray;
        console.log(previousAdvingData,optionalCourses);
        res.send(true);
        stCourseCompletion_collection.bulkWrite(previousAdvingData.map( function(p) { 
          // console.log(`${p._id}`,p.completed);
          return { updateOne:{
                        filter: {_id: p._id},
                        update: {
                          $set:{
                          completed: p.completed,
                          completeCredit:util.countCredit(p.completed),
                          },
                          $pull:{
                            "incompleted":{_id:{$in:p.completed}},
                          },
        
                        }
          }}
        
        }))
        .then(result=>{
          console.log("perform set and pull operaition: \n "+result);
          if(result.nModified){
            stCourseCompletion_collection.bulkWrite(previousAdvingData.map( function(p) { 
              // console.log(`${p._id}`,p.completed);
              return { updateOne:{
                          filter: {_id: p._id},
                          update: {
                            $pull:{ "incompleted.$[].preReq":{$in:p.completed}}
                          }}}
            }))
            .then(result=>{
              console.log("pull in the nested array.. removing details from preREq array: \n"+result);
              if(result.nModified){
                stCourseCompletion_collection.bulkWrite(optionalCourses.map( function(p) { 
                  // console.log(`${p._id}`,p.category);
                  return { updateOne:{
                                filter: {_id: p._id},
                                update: {
                                  $pull:{
                                    "incompleted":{category:{$in:p.category}},
                                  }, 
                                }
                  }}
          
                }))
                .then(result=>{
                  console.log("category:"+result);
                  res.send(true);
                })
              }
            })
          }
        })

    })

    app.get('/getOfferlist',(req,res)=>{
      console.log("get offer list");

      stCourseCompletion_collection.aggregate([
        {
          "$unwind": "$incompleted"
        },
        {
          "$group": {
            "_id": "$incompleted",
            eligibleStudents: {
              "$push": "$_id",
            },
            
          }
        },
        {
          "$match": {
            "_id.preReq": {
              $size: 0
            }
          }
        },
        { "$sort": { "_id.slNo" : 1 } },

      ])
      .toArray((err,result)=>{
          console.log(result);
          res.send({result})
      })

    })

    app.post("/addStudent",(req, res) => {
      const data=req.body.data;
      let dataObj=JSON.parse(data);
      if(req.body.file!==null){
        const file=req.files.file;
        const encImg=newImg.toString('base64');
        const image={
          contentType: file.mimetype,
          img: encImg,
          size: file.size
        }
        dataObj={...dataObj,image};
      }
      else{
        dataObj.img=null;
      }
        
      try{
        students_collection.insertOne(dataObj)
        .then(result=>{
          if(result.acknowledged){
            console.log("added document",result.acknowledged);
            const stCourseCompetionObj={_id:data._id,completeCredit:0,completed:[],incompleted:util.cseCourses}
            stCourseCompletion_collection.insertOne(stCourseCompetionObj)
            .then(result=>{
              console.log(result);
              res.send(true);
            })
            
          }
        });
      }
      catch(e){
        console.log(e)
        res.send({error:e});
      }

      

       
    });

    app.post("/addTeacher",(req,res)=>{
      const data =req.body.data;
      let dataObj=JSON.parse(data);
      console.log(req.body);
      if(req.body.file!=='null'){
        const file=req.files.file;
        const newImg=file;
        const encImg=newImg.toString('base64');
        const image={
          contentType: file.mimetype,
          img: encImg,
          size: file.size
        }
        dataObj.img=image;
      }
      else{
        dataObj.img=null;
      }

      teachers_collection.insertOne(dataObj)
        .then(result=>{
          console.log("added document");
          if(result.acknowledged===true){
            res.send(true);
          }
        });
    })

    app.get('/allStudents',(req,res)=>{
      students_collection.find(
        { },
        {
        "Address": 1,
        "age": 0,
        "dateOfBirth": 0,
        "department": 1,
        "email": 1,
        "firstName": 1,
        "gender": 0,
        "id": 1,
        "img": 1,
        "lastName": 0,
        "phone": 0,
        "_id": 0,
      })
      .toArray((err,result)=>{
        console.log(result);
        res.send(result);
      })
    })
    app.get('/allTeacher',(req,res)=>{
      teachers_collection.find(
        { },
        {
        Address: 1,
        age: 0,
        dateOfBirth: 0,
        department: 1,
        email: 1,
        firstName: 1,
        gender: 0,
        id: 1,
        img: 1,
        lastName: 0,
        phone: 0,
        _id: 0,
      })
      .toArray((err,result)=>{
        console.log(result);
        res.send(result);
      })
    })
    app.post('/addManyStudent',(req,res)=>
    {
      const infoFile= req.body;
      let courseCompletionObjArray=[];
      infoFile.map(data=>{
        const completionObj={_id:data._id,completeCredit:0,completed:[],incompleted:util.cseCourses}
        courseCompletionObjArray.push(completionObj);
      });
      
      try {
        console.log(" loading");
        students_collection.insertMany(infoFile)
        .then(result=>{
          console.log("course completion object added");
          stCourseCompletion_collection.insertMany(courseCompletionObjArray)
          .then(reult=>{
            console.log(result);
            res.send(true);
          })
          
        })
        
     } catch (e) {
        console.log(e);
     }
    })

    app.post('/addManyTeacher',(req,res)=>{
      const infoFile= req.body;
      console.log(infoFile); 
      try {
        teachers_collection.insertMany(infoFile);
        console.log("teacher added");
        res.send(true);
     } catch (e) 
     {
        console.log(e);
     }
    })

    app.get('/searchStudentById/:id',(req,res)=>{
      const id=parseInt(req.params.id);
      let newData={id:id,personalDetails:{},academicDetails:{},eligibleForNextSemester:[],customisedCourse:[]};
      // res.send(typeof(id));
      students_collection.find({_id:id})
      .toArray((err,result1)=>{
        if(!err){
          newData.personalDetails=result1;
          stCourseCompletion_collection.find({_id:id})
          .toArray((err,result2)=>{
            if(!err){
              newData.academicDetails=result2;
              stCourseCompletion_collection.aggregate([
                {
                  "$match": { "_id": id }
                },
                {
                  "$unwind": "$incompleted"
                },
                {
                  "$group": {"_id": "$incompleted", }
                },
                {
                  "$match": {
                    "_id.preReq": { $size: 0}
                  }
                }
              ])
              .toArray((err,result3)=>{
                if(!err){
                  newData.eligibleForNextSemester=result3;
                  // res.send(newData)
                  customiseList_collection.aggregate(
                    [{
                      "$match": {_id: "Summer22"}
                    },
                    {"$unwind": "$customiseList"},
                    {
                      "$unwind": "$customiseList.eligibleStudents"
                    },
                    {
                      "$group": {
                        "_id": "$customiseList.eligibleStudents",
                        crs: { "$push": "$customiseList._id._id"}
                      }
                    },
                    {
                      "$match": { "_id": {$in: [id]}}
                    },
                    {
                      "$group": {
                        "_id": null,
                        courses: {"$push": "$crs"}
                      }
                    }
                  ],
                  ).toArray((err,result4)=>{
                    if(!err){
                      newData.customisedCourse=result4;
                      console.log(result4);
                      res.send(newData);
                    }
                    else{
                      res.send(err);
                    }
                  })

                }
                else{res.send(err)}
              })

            }
            else{
              res.send(err)
            }
          })
        }
        else{
          res.send(err)
        }
      })
    })
    app.delete('/dltStudentById/:id',(req,res)=>{
      console.log(req.params.id);
      students_collection.deleteOne({_id:req.params.id})
      .then(result=>{
        if(result.acknowledged){
          res.send(true);
        }
      })
    })

    app.delete('/dltTeacherById/:id',(req,res)=>{
      console.log(req.params.id);
      teachers_collection.deleteOne({_id:req.params.id})
      .then(result=>{
        if(result.acknowledged){
          res.send(true);
        }
      })
    })

    app.post('/addEvent',(req,res)=>{
      const eventData=req.body.eventsData;
      const mainData=JSON.parse(eventData); 
      // mainData.date=new Date(mainData.date);
      if(mainData){
        events_collection.insertOne(mainData)
        .then(result=>{
          console.log(result)
        })
        res.send(true);
      }
      
    })

    app.get('/getEvent',(req,res)=>{
      const currentDate=new Date();
      console.log(currentDate.toISOString());
      events_collection.find({
        date: {
          $gt:currentDate.toISOString()
        }})
      .toArray((err,result)=>{
        console.log(result);
        res.send(result);

    })
      
    })
    app.post('/addCourses',(req,res)=>{
      console.log("hi"+req.body);
      courses_collection.insertOne(req.body)
      .then(result=>{
        console.log("added document");
        if(result.acknowledged===true){
          res.send(true);
        }
      });

    })
    app.get('/allCourses',(req,res)=>{
      courses_collection.find({})
      .toArray((err,result)=>{
        console.log(result);
        if(!err)
        {
          console.log(result)
          res.send(result);
        }
        else{
          res.send(err);
        }
      })
      
    })
    app.get('/conplete_Incomplete_Student/:courseId',(req,res)=>{
      const courseId=req.params.courseId;
      console.log(courseId);
      const studentList={};
      stCourseCompletion_collection.aggregate([
        {
          "$match": { 
            completed:  {$in: [`${courseId}`]}}
          },
        {
          "$group": {
            "_id": null,
            studentId: { "$push": "$_id" } }
        }
      ])
      .toArray((err,result)=>{
        console.log(result)
        studentList.completed=result;
        if(!err){
          stCourseCompletion_collection.aggregate([
            {
              "$match": {  completed:  {$nin: [ `${courseId}`]}}
              },
            {
              "$group": {
                "_id": null,
                studentId: { "$push": "$_id" } }
            }
          ])
          .toArray((err,result)=>{
            studentList.incompleted=result;
            if(!err){
              res.send(studentList)
            }
          })
        }
      })
    })
    app.delete('/deleteCourseById/:courseId',(req,res)=>{
      console.log(req.params);
      courses_collection.deleteOne({_id:req.params.courseId})
      .then(result=>{
        console.log(result);
        if(result.deletedCount>0){
          res.send(true);
        }
      })
    })
    app.get('/getOptionalCourse',(req,res)=>{
      courses_collection.find({category:{$ne:""}},{ name: 1, category: 1 })
      .toArray((err,result)=>{
        console.log(result);
        const optionalCourse=[];
        if(!err)
        {
          res.send(result);
        }
        else{
          res.send(err);
        }
      })
    })
    app.get('/userById/:email',(req,res)=>{
      console.log(req.params);
      user_collection.find({_id:req.params.email})
      .toArray((err,result)=>{
        console.log("result: "+result);
        res.send(result);
      })
    })
    app.post('/addUser',(req,res)=>{
      console.log("hi"+req.body);
      user_collection.insertOne(req.body)
      .then(result=>{
        console.log("added document");
        if(result.acknowledged===true){
          res.send(true);
        }
      });
    })

    app.get('/allUsers',(req,res)=>{
      user_collection.find({})
      .toArray((err,result)=>{
        console.log(result);
        if(!err)
        {
          console.log(result)
          res.send(result);
        }
        else{
          res.send(err);
        }
      })
      
    })

    app.post('/addCustomizedList',(req,res)=>{
      const object=req.body;
      console.log(object.customiseList[0]);
      customiseList_collection.insertOne(object)
      .then(result=>{
        console.log(result);
      })
    })

    app.get('/searchCustomizedList/:semester',(req,res)=>{
      const semester=req.params.semester;
      console.log(semester)
      customiseList_collection.find({"_id":semester}).count()
      .then(result=>{
        // console.log(result);
        if(result==0){
          res.send(false);
        }
        else{
          res.send(true);
        }
        
      })
      
    })
    app.get('/getCustomizedList/:semester',(req,res)=>{
      const semesterId=req.params.semester;
      console.log(semesterId)
      customiseList_collection.find({"_id":semesterId})
      .toArray((err,result)=>{
        if(!err){
          console.log("custom list achieved");
          res.send(result)
        }
        else{
          console.log(err);
        }
      })
    })
    app.patch('/updateCustomizedList',(req,res)=>{
      const data=req.body;
      // console.log(data._id,data.removalCourses);
      console.log("calling update")
      customiseList_collection.updateOne(
        {"_id":data._id},
        {$set:{
          "customiseList":data.customiseList,
          "removalCourses":data.removalCourses
        },
      }).then(result=>{
        console.log(result);
      })
    })
    app.patch('/reAddCourseInList',(req,res)=>{
      const data=req.body;
      console.log(data.courseData._id._id,data.semester,data.courseData);
      customiseList_collection.updateOne(
        {_id:data.semester},
        {
          $push: {
            "customiseList":data.courseData
          }
        },
        )
      .then(result=>{
        if(result.acknowledged){

          customiseList_collection.updateOne(
            {_id:data.semester},
            {
              '$pull':{
                'removalCourses':{
                    '_id._id':data.courseData._id._id
                }
              }
            }
    )
    .then(result=>{
      console.log(result);
      res.send(result);
    })
         
        }
      })
    })

    app.post('/getStudentsCompletedCredit',(req,res)=>{
      const allId=req.body.map(Number);
      console.log(allId);
      stCourseCompletion_collection.aggregate([
        {
          '$match':{_id:{$in:allId}}
        },
        {
          $group:{
            "_id": null,
            completedCredits: { "$push": "$completeCredit" } 
          }
        }
      ])
      .toArray((error,result)=>{
        console.log(result);
        res.send(result[0].completedCredits);
      })

    })
    app.post('/editStudentsEligibleCourse',(req,res)=>{
      const nextSemester=util.getNextSemester();
      const {id,addCourse,removedCourse}=req.body;
      console.log(id,addCourse,removedCourse);
      customiseList_collection.updateMany(
        {_id:nextSemester},
        {
          '$push':{
            "customiseList.$[elem].eligibleStudents":id
          },
        },
        {
          arrayFilters: [
            {
              "elem._id._id": {
                $in:addCourse
              }
            }
          ]
        },
        )
        .then(result=>{
          console.log("after push",result);
           if(result.matchedCount>0){
            customiseList_collection.updateMany(
              {_id:nextSemester},
              {
                '$pull':{
                  "customiseList.$[elem].eligibleStudents":id
                },
              },
              {
                arrayFilters: [
                  {
                    "elem._id._id": {
                      $in:removedCourse
                    }
                  }
                ]
              },
              ).then(result=>{
                console.log("after pull",result)
                res.send(true);
              })

           }
           else{
             res.send(false)
           }
        })
    })

    app.post('/editStudentsCourses',(req,res)=>{
      console.log(req.body);
      const {addedToCompleted,deletedFromCompleted,id}=req.body;
      const array=[...addedToCompleted,...deletedFromCompleted];
      
      let addTocomplete={categories:[],particularSubjects:[]},removeFromComplete={categories:[],particularSubjects:[]};
        courses_collection.aggregate([
          {"$match":{
            _id:{"$in":array }}
          },
          {
            "$group":{
              "_id":null,
              "categories":{
                "$push":"$category"
              }
            }
          }
        ]).toArray((err,result)=>{
          if(!err){
            // console.log(result[0].categories);
            i=-1;
            result[0].categories.map(element=>{
              i++;
              if(i<addedToCompleted.length){
                if(element==='')
                {
                  console.log('particular add to comp');
                  addTocomplete.particularSubjects[addTocomplete.particularSubjects.length]=array[i];
                }
                else{
                  console.log('category add to comp')
                  addTocomplete.categories[addTocomplete.categories.length]=element;
                }
              }
              else{
                if(element==='')
                {
                  console.log('particular remove from comp:',array[i])

                  removeFromComplete.particularSubjects[removeFromComplete.particularSubjects.length]=array[i];
                }
                else{
                  console.log('category remove from comp:',element)
                  removeFromComplete.categories[removeFromComplete.categories.length]=element;
                }
              }
            })          
            console.log('add:',addTocomplete,'\nremove:',removeFromComplete)

            if(removeFromComplete.categories.length||removeFromComplete.particularSubjects.length){
              let courseAddedToIncompleteList=[];
              //finding all the courses added that have to added in incompleted list
              courses_collection.find({$or:[{category:{$in:removeFromComplete.categories}},{_id:{$in:removeFromComplete.particularSubjects}}
            ]})
                .toArray((err,result)=>{
                  console.log(result);
                  if(!err){
                    courseAddedToIncompleteList=result;
                  }

                })
                console.log(courseAddedToIncompleteList);
              //courses(some courses) added to completed list and also (some other courses) deleted from completed list
              // if((addTocomplete.categories.length||addTocomplete.categories.length)){
              //   stCourseCompletion_collection.updateOne(
              //     {_id:id},
              //     {$push:{
              //       "completed":{$each:addedToCompleted},
              //       "incompleted":{$each:courseAddedToIncompleteList}
              //       }
              //     },
              //     {
              //       $pull:{
              //         "completed":{$in:deletedFromCompleted},
              //         "incompleted":{_id:{$in:addTocomplete.particularSubjects}}
              //       }
              //     }
              //   ).then(result=>{
              //     console.log(result);
              //   })

              // }
              // else{
              //   stCourseCompletion_collection.updateOne(
              //     {_id:id},
              //     {$push:{ 
              //       "incompleted":{$each:courseAddedToIncompleteList}
              //       }
              //     },
              //     {
              //       $pull:{
              //         "completed":{$in:deletedFromCompleted},
              //       }
              //     }
              //   ).then(result=>{
              //     console.log(result);
              //   })

              // }

            }
            //courses added to completed list 
            else{
              //deleted the course that is completed by that student
              admins_collection.updateOne(
                {_id:id},
                {$push:{
                  "completed":{$each:addedToCompleted},
                  }
                },
                {
                  $pull:{
                    "incompleted":{_id:{$in:addTocomplete.particularSubjects}}
                  }
                }
              ).then(result=>{
                console.log(result);
                //delete the course from others pre requisite array in incopleted list
                admins_collection.updateOne(
                  {_id:id},
                  {$pull:{"incompleted.$[].preReq":{$in:addedToCompleted}}}
                ).then(result=>{
                  console.log(result);
                  //delete all the same category course of the course frim incomplete list
                  admins_collection.updateOne(
                    {_id:id},
                    {$pull:{
                      "incompleted":{category:{$in:addTocomplete.categories}}
                    }}

                  )
                })  
              })
            } 
          }
        })
    })
    app.post('/addClassRoom',(req,res)=>{
      console.log(req.body);

      rooms_collection.insertOne(req.body,(err,result)=>{
        if(err){
          res.send({error:err});
        }
        else{
          res.send(true);
        }
      })
    })
    app.get('/getAllClassRooms',(req,res)=>{
      rooms_collection.find({})
      .toArray((err,result)=>{
        if(!err){
          res.send(result);
        }
        else{
          res.send(err);
        }
      })
    })

    app.get('/getDataForAlterBatch/:semId',(req,res)=>{
      const semesterId=req.params.semId;
      customiseList_collection.find({"_id":semesterId})
      .toArray((err,listResult)=>{
        if(!err){
          res.send({data:listResult});
          console.log(listResult[0].customiseList[0]);
        }
        else{
          console.log(err);
          res.send(err)
        }
      })
    })
    app.post('/confirmAdvisedCourseExternal/:semester',(req,res)=>{
      const newData=req.body;
      const semester=req.params.semester;
      try{
        customiseList_collection.replaceOne({_id:semester},newData)
        .then(result=>{
          if(result.acknowledged===true){
            res.send(true);
          }
          else{
            console.log("error");
          }
        });

      }catch(e){
        res.send(e);
      }
     

    })
   
    app.patch('/editClassRoom',(req,res)=>{
      const {room,timeSlots,dayFor}=req.body;
      const day=dayFor[0]==='S'?'slotsForST':dayFor[0]==='M'?'slotsForMW':'slotsForTH';
      console.log(day)
      let query={};
      query[day]=timeSlots;
      console.log(query)
      rooms_collection.updateOne(
        {_id:room},
        {$set:query},
        )
        .then(result=>{
          if(result.acknowledged===true){
            res.send(true);
          }
          else{
            res.send(error);
          }
          
        })
    })
    app.get('/getRoutine/:sem',(req,res)=>{
      const semester=req.params.sem;
      console.log(semester)
      routine_collection.find({_id:semester})
      .toArray((err,result)=>{
        if(!err){
          res.send({data:result})
        }
        else{
          res.send({error:err});
        }
      })
    })
    app.delete('/deleteClassRoom/:id',(req,res)=>{
      const id=req.params.id;
      rooms_collection.deleteOne({"_id" :id})
      .then(result=>{
       if(result.acknowledged){
         res.send(true)
       }
      })
      
    })
    app.get('/addC',(req,res)=>{
    
    // stCourseCompletion_collection.deleteMany({});
    // students_collection.deleteMany({});
    // rooms_collection.update({},{$set:{"roomType":'Theory'}});
    // routine_collection.find({_id:"Summer22"})
    // .toArray((err,result)=>{
    //   // console.log(result[0].routine)
    //   res.send(result[0].routine);
    //   extra.insertOne({
    //     _id:result[0]._id,
    //     customiseList:result[0].routine,
    //     removalCourses:[]
    //   })
    // })
    // res.send(true);       
    })

    app.get('/getSubjectforRoutine/:option',(req,res)=>{
      const option=req.params.option;
      console.log(`getSubjectforRoutine ${option}`);
      const semester=util.getNextSemester();
      if(option==='create'){
        customiseList_collection.aggregate([
          {"$match": { _id:semester}},
          {"$unwind": "$customiseList"},
          {"$unwind": "$customiseList._id"},
          { "$group": {"_id":null,
              routineSubjects: {
                "$push": {"_id":"$customiseList._id._id",
                "faculty":"$customiseList.faculty",
                "timeSlot":"$customiseList.timeSlot",
                "roomNo":"$customiseList.roomNo",
                "eligible":"$customiseList.eligibleStudents"}}}
          },
          { "$sort": { "customiseList._id.slNo" : 1 } }, 
        ]).toArray((err,result4)=>{
          if(!err){
            res.send({data:result4[0]});
          } else{
            res.send(err);
          }
        })
      }
      else{
        routine_collection.aggregate([{$match:{_id:semester}},{$project:{routine:0,_id:0}}])
        .toArray((err,result)=>{
          if(!err){
            res.send(result[0]);
          }
          else{
            res.send({error:err})
          }
        })
      }

    })
    app.post('/submitRoutine/:option',(req,res)=>{
      let data=req.body;
      const option=req.params.option;
      data._id=util.getNextSemester();
      if(option==='create'){
        routine_collection.insertOne(data,(err,result)=>{
          console.log(result)
          if(err){
            res.send({error:err});
          }
          else{
            res.send(true);
          }
        })
      }
      else{
        console.log(option);
        res.send(true);
      }
      
      
    })

    app.get('/qCheck',(req,res)=>{
      admins_collection.updateOne(
        {_id:"Spring22"},
        { $push:  {removalCourses:{ $each: [] }} }
      ).then(result=>{
        console.log(result);
        res.send(true);
      })
    })
});

app.listen(5000,()=>{
    console.log("website is running 5000");
})