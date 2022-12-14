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
    const advised_student_tracker_collection=client.db("ciu-app").collection("advised_student_tracker")

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
          console.log(err,result);
          res.send({result})
      })

    })

    app.post("/addStudent",(req, res) => {
      const data=req.body.data;
      let dataObj=JSON.parse(data);
      // dataObj["_id"]=parseInt(dataObj["_id"])
      console.log(dataObj);
      // if(req.body.file!==null){
      //   const file=req.files.file;
      //   const encImg=newImg.toString('base64');
      //   const image={
      //     contentType: file.mimetype,
      //     img: encImg,
      //     size: file.size
      //   }
      //   dataObj={...dataObj,image};
      // }
      // else{
      //   dataObj.img=null;
      // }
      try{
        students_collection.insertOne(dataObj)
        .then(result=>{
          if(result.acknowledged){
            console.log("added document",result.acknowledged);
            const stCourseCompetionObj={_id:dataObj["_id"],completeCredit:0,completed:[],incompleted:util.cseCourses}
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
        data._id=data._id.toString();
        const completionObj={_id:data._id,completeCredit:0,completed:[],incompleted:util.cseCourses}
        // console.log(completionObj);
        courseCompletionObjArray.push(completionObj);
      });
      // console.log(courseCompletionObjArray)
      
      try {
        console.log(" loading");
        students_collection.insertMany(infoFile)
        .then(result=>{
          console.log("course completion object added");
          stCourseCompletion_collection.insertMany(courseCompletionObjArray)
          .then(reult=>{
            console.log(result);
            res.send(courseCompletionObjArray);
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
      const id=req.params.id;
      let newData={id:id,personalDetails:{},academicDetails:{},eligibleForNextSemester:[],customisedCourse:[]};
      // res.send(typeof(id));
      students_collection.find({_id:id})
      .toArray((err,result1)=>{
        if(!err){
          newData.personalDetails=result1[0];
          stCourseCompletion_collection.find({_id:id})
          .toArray((err,result2)=>{
            if(!err){
              console.log("result2 310",result2);
              newData.academicDetails=result2[0];
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
                      "$match": {_id: util.getNextSemester()}
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
                      newData.customisedCourse=result4.length!==0?result4[0]['courses'][0]:result4;
                      console.log("result4 359",result4);
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
      const id=req.params.id
      students_collection.deleteOne({_id:id})
      .then(result=>{
        console.log("r1:",result);
        // if(result.acknowledged){
          stCourseCompletion_collection.deleteOne({_id:id})
          .then(result=>{
            console.log("r2:",result);
          })
          res.send(true);
        // }
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
      mainData.start=new Date(mainData.start);
      mainData.end=new Date(mainData.end);
      console.log(mainData);
      if(mainData){
        events_collection.insertOne(mainData,(err,result)=>{
          if(!err){
            res.send(true);
          }
          else{
            res.send(err)
          }

        })
        
      }
      
    })

    app.get('/getDashboardData',(req,res)=>{
      events_collection.aggregate([
        {$project: {type: 1, month: {$month: '$orderDate'}}},
        {$match: {month: 05}}
      ]).toArray((err,resultr)=>{
        if(!err){
          console.log("dashboardData asdjns",err,resultr)
        }
        else{
          res.send(false)
        }
        
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
        if(err){
          console.log(err)
        }
        else{
          console.log("result: "+result);
          res.send(result);
        }
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
      const allId=req.body;
      console.log("klklklkl",allId,"kllll");
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
        console.log("ff",result,"fff");
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
    //merging the all the courses in this array, the courses which we add to complete list 
    //and the course which we want to delete from completed list
    //we create this array to find all the courses that have same category like these courses
      const array=[...addedToCompleted,...deletedFromCompleted];
      
      let addTocomplete={categories:[],particularSubjects:[]},
      removeFromComplete={categories:[],particularSubjects:[]};
      //here we use aggregate pipeline to find all the same category courses
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
        //as use the agregate pipeline we have some results. we get the categories but
        //there is  some courses that has no categories.so for those courses this query send ''or empty string 
        if(!err){
           // console.log(result[0].categories);
           //here we separate the courses which have category from the non-categorised courses
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
            //finding all the courses added that have to add in incompleted list
            courses_collection.find({$or:[{category:{$in:removeFromComplete.categories}},{_id:{$in:removeFromComplete.particularSubjects}}]})
            .toArray((err,result)=>{
              if(!err){
                courseAddedToIncompleteList=result;
                // console.log("---------",courseAddedToIncompleteList,"----------")
                // courses(some courses) added to completed list and also (some other courses) deleted from completed list
                if((addTocomplete.categories.length||addTocomplete.particularSubjects.length)){
                  console.log("hjhiurybfhdbfweufbsinx",addTocomplete,courseAddedToIncompleteList);
                  stCourseCompletion_collection.updateOne(
                    {_id:id},
                    {$push:{
                      "completed":{$each:addedToCompleted},
                      "incompleted":{$each:courseAddedToIncompleteList}
                      },
                    },
                  ).then(result=>{
                    console.log("line no 804",deletedFromCompleted);
                    stCourseCompletion_collection.updateOne(
                      {_id:id},
                      {
                        $pull:{
                          "completed":{$in:deletedFromCompleted},
                          "incompleted":{_id:{$in:addTocomplete.particularSubjects}}
                        }
                      },
                    ).then(result2=>{
                      console.log(result2);
                    })
                  })
                }
                else{
                  console.log("822  ", courseAddedToIncompleteList, deletedFromCompleted)
                  //when there is no need to add course in complete list. that means here user want to remove course from completed list
                  //the course which we removed from complete list,that course and same category course will added to the incompleted list
                  stCourseCompletion_collection.updateOne(
                    {_id:id},
                    {$push:{ 
                      "incompleted":{$each:courseAddedToIncompleteList}
                      },
                      $pull:{
                        "completed":{$in:deletedFromCompleted},
                      }
                    }
                  ).then(result=>{
                    console.log(result);
                  })
                }

                // another work to do, we have to add the course in pre-requisite array which we removed from completed list
                const courseToBeAddedToPreReq=util.findPre_requisitesParentCourse(courseAddedToIncompleteList);
                if(courseToBeAddedToPreReq.length>0){
                  console.log(courseToBeAddedToPreReq);
                  stCourseCompletion_collection.bulkWrite(courseToBeAddedToPreReq.map( function(obj) { 
                    const {parentCourseName,courseAddedToPreReq}=obj;
                    return {updateOne:{
                              filter: {_id: id},
                              update: {
                                $push:{ "incompleted.$[course].preReq":courseAddedToPreReq}
                              },
                              arrayFilters: [
                                {
                                  "course._id": parentCourseName
                                }
                              ]
                            }}
                  }))
                  .then(result=>{
                    console.log(result);//it worked. I verified it
                  })
                }
            }
          })
          }

            // here we add the courses to the complete list which completed by the student
            // course is completed that means we have to remove the course from incompleted course list
            else{
              //deleted the course from incomplete list that is completed by that student
              //and also added the course into completed list
              console.log(addTocomplete.particularSubjects);
              stCourseCompletion_collection.updateOne(
                {_id:id},
                {
                  $push:{
                  "completed":{$each:addedToCompleted},
                  },
                  $pull:{
                    "incompleted":{_id:{$in:addTocomplete.particularSubjects}}
                  }
                }
              ).then(result=>{
                console.log(result);
              // delete the course from others pre requisite array in incopleted list
                stCourseCompletion_collection.updateOne(
                  {_id:id},
                  {$pull:{"incompleted.$[].preReq":{$in:addedToCompleted}}}
                ).then(result=>{
                  console.log(result);
                  //delete all the same category course of the course from incomplete list
                  stCourseCompletion_collection.updateOne(
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
        res.send(true);
    })
    app.post('/addClassRoom',(req,res)=>{
      console.log(req.body);

      rooms_collection.insertOne(req.body,(err,result)=>{
        console.log(err)
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
      console.log(semesterId)
      
      customiseList_collection.find({"_id":semesterId})
      .toArray((err,listResult)=>{
        if(!err){
          res.send({data:listResult});
          // console.log(listResult[0].customiseList[0]);
        }
        else{
          console.log(err);
          res.send(err)
        }
      })
      console.log("line 941",semesterId);
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
    students_collection.deleteMany({});
    stCourseCompletion_collection.deleteMany({});
    res.send(true);
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
          // {"$unwind": "$customiseList._id"},
          { "$group": {"_id":null,
              routineSubjects: {
                "$push": {"_id":"$customiseList._id",
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
        console.log(',,,')
        routine_collection.aggregate([{$match:{_id:semester}},{$project:{routine:0,_id:0}}])
        .toArray((err,result)=>{
          if(!err){
            res.send(result);
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
      console.log(option)
      data._id=util.getNextSemester();
      if(option==='create'){
        try{
          console.log('.......................cr')
          routine_collection.insertOne(data,(err,result)=>{
            console.log(err,result)
          if(err){
            res.send({error:err});
          }
          else{
            res.send(true);
            
          }})
        }
        catch(e){
          console.log('.......................',e)
          res.send(e);
        }
      }
      else{
        try {
          routine_collection.replaceOne({_id:data._id},data)
          .then(result=>{
            if(result.acknowledged===true){
              res.send(true);
            }
            else{
              res.send({error:'something went wrong'})
            }
          })
        } catch (e){
            res.send({error:e})
        }
      }
      
      
    })
    app.post('/uploadRoutine',(req,res)=>{
      console.log('upload')
      res.send(true);
    })
    app.get('/findAllStudentsName_Id',(req,res)=>{
      students_collection.aggregate([ { $project : { _id : 1 , name : 1 } } ] )
      .toArray((err,result)=>{
        if(!err){
          res.send({result:result});
        }
        else{
          res.send({err:err})
        }
        
      })
    });
    app.get('/getAdvisedStudents/:advisorName',(req,res)=>{
      const advisorName=req.params.advisorName;
      console.log(req.params.advisorName);
      students_collection.find({advisor:advisorName},{_id:1,name:1,semester:1})
      .toArray((err,result)=>{
        res.send({result:result})
      })
      
    })
    app.post("/setAdvisedData_to_tracker",(req,res)=>{
      const mainData=req.body;
      const semesterId=mainData.nextSem;
      advised_student_tracker_collection.find({_id:semesterId})
      .toArray((err,result)=>{
        console.log("result: ",result.length);
        if(result.length===0){
          const convertedData=util.makeObject_to_saveInTacker(mainData);
          advised_student_tracker_collection.insertOne(convertedData,(err,result)=>{
            console.log(err,result);
          })
          
        }
        else{
          let tempData=result[0],stFlag=0,authorFlag=0;

          // res.send(tempData)
          // console.log(result.authors)
          tempData.authors.map(item=>{
            if(item.authorEmail===mainData.user.email){
              authorFlag=1;
              // res.send({a:"emails",b:item.authorEmail,c:mainData.user.email});
              item.AdvisedStudents.map(stObj=>{
                if(stObj.studentsId===mainData.data.id){
                  stObj["addedToCompleted"].push(mainData.data.addedToCompleted);
                  stObj["deletedFromCompleted"].push(mainData.data.deletedFromCompleted);
                  stObj.lastModified=mainData.data.lastModified;
                  stFlag=1;

                }
                //else
              })
              if(stFlag===0){
                //------------------
                let tempStudentObj={
                  studentsId:mainData.data.id,
                  studentsName:mainData.data.stName,
                  addedToCompleted:mainData.data.addedToCompleted,
                  deletedFromCompleted:mainData.data.deletedFromCompleted,
                  lastModified:mainData.data.lastModified
                }
                item.AdvisedStudents.push(tempStudentObj)
              }

            }
            //else
          })
          if(authorFlag===0){
            //-----------------------
            let tempAuthorsObj={
              authorName:mainData.user.name,
              authorEmail:mainData.user.email,
              AdvisedStudents:[
                {
                  studentsId:mainData.data.id,
                  studentsName:mainData.data.stName,
                  addedToCompleted:mainData.data.addedToCompleted,
                  deletedFromCompleted:mainData.data.deletedFromCompleted,
                  lastModified:mainData.data.lastModified
                }
              ]
            }
            tempData.authors.push(tempAuthorsObj)
          }
          advised_student_tracker_collection.replaceOne({_id:semesterId},tempData,(err,result)=>{
            console.log(err,result);
          })
        }
        
      })
      res.send(true)
    })
    app.get('/getSurveyAttendeesBySemester/:semester',(req,res)=>{
      const semester=req.params.semester;
      advised_student_tracker_collection.find({_id:semester})
      .toArray((err,result)=>{
        res.send({result:result[0]})
      })
    })
    app.post('/updateStudentsData',(req,res)=>{
      const data=req.body;
      students_collection.updateOne(
        {_id:data.id},
        {
          $set:{
            name:data.name,
            advisor:data.advisor,
            dept:data.dept,
          }
        }
      )
      .then(result=>{
        if(result.acknowledged==true){
          res.send(true)
        }
        else{
          res.send(false)
        }
      })
      res.send(data);

    })
    app.post('/replace',(req,res)=>{
      const data=req.body;
      // try{
      //   customiseList_collection.replaceOne({_id:'Autumn22'},data)
      //   .then(result=>{
      //     console.log("result of replace: ", result);
      //     if(result.acknowledged===true){
      //       res.send(true);
      //     }
      //     else{
      //       console.log("error");
      //     }
      //   });

      // }catch(e){
      //   res.send(e);
      // }
    })
    app.get('/qCheck',(req,res)=>{
      // events_collection.insertOne({title:"hello",date:new Date()})
      // res.send(true)
      // events_collection.find({
      //   date: {
      //     $gte:new Date()
      //   }})
      // .toArray((er,result)=>{
      //   console.log(result)
      //   res.send(result)
      // })
      // events_collection.aggregate([
      //   {
      //     $project:{
      //       eventTitle:1,
      //       date:{$month: '$date'}
      //     }
      //   },
      //   {
      //     $match: {
      //       date:01
      //     }
      //   }
      // ])
      // .toArray((err,result)=>{
      //   res.send(result);
      //   console.log('resEv',result)
      // })

      // customiseList_collection.find({_id:"Autumn22"})
      // .toArray((err,result)=>{
        
      //   routine_collection.find({_id:"Autumn22"})
      //   .toArray((err,result_1)=>{
      //     res.send({result:result, result_1:result_1});
      //   })
      // })
      // stCourseCompletion_collection.deleteMany({})
      // students_collection.deleteMany({})
      res.send(true);
    })
    
});


app.listen(5000,()=>{
    console.log("website is running 5000");
})