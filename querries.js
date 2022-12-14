// querry for find the subject for a particular id which pre-requisit array is empty 
db.collection.aggregate([
  {
    "$unwind": "$incompleted"
  },
  {
    "$group": {
      "_id": "$incompleted",
      id: {
        "$push": "$id"
      }
    }
  },
  {
    "$match": {
      "_id.preReq": {
        $size: 0
      }
    }
  }
]).toArray((err,result)=>{
      console.log(result);
    })

    //-------------------------------------------//
// the querry is used to find the the subjects which preRequisits already completed by  a particular student 
    stCourseCompetion_collection.find(
      {
        "incompleted.preReq": {
          $size: 0
        }
      },
      {_id: 0,id: 1}
      ).toArray((err,result)=>{
        console.log(result);
        res.send({result})
    })

///----------------------queris for upload advising list and delete the completede courses from the course completion object-----------------

//update the completed array and delete data from the stuent object
students_collection.updateOne({
  "_id": "17202158"
},
{
  $set: {
    "completed": [
      "a",
      "b"
    ]
  },
  "$pull": {
    "incomplete": {
      "name": {
        $in: [
          "math",
          "science"
        ]
      }
    }
  }
})
res.send(true);

//queris for deleting the completed course from the pre-requisite array
students_collection.update({
  "_id": "17202155"
},
{
  $pull: {
    "incomplete.$[].preReq": {
      $in: [
        "math",
        "science"
      ]
    }
  }
})

//queries for deleting the optional courses
students_collection.update({
  "_id": "17202155"
},
{
  $pull: {
    "incomplete": {
      category: {
        $in: [
          "elective1",
          "elective3"
        ]
      }
    }
  }
})

//now merging the three queries for a checking a number of students data
students_collection.bulkWrite(advisingFile.map( function(p) { 
  console.log(`${p._id}`,p.completed);
  return { updateOne:{
                filter: {_id:p._id,},
                update: {
                  $set:{
                  completed: p.completed,
                  },
                  $pull:{
                    "incompleted":{name:{$in:p.completed}},
                  },

                }
  }}

}))
.then(result=>{
  console.log(result);
  if(result.nModified){
    students_collection.bulkWrite(advisingFile.map( function(p) { 
      console.log(`${p._id}`,p.subject);
      return { updateOne:{
                  filter: {_id: `${p._id}`},
                  update: {
                    $pull:{ "incompleted.$[].preReq":{$in:p.subject}}
                  }
      }}
    }))
    .then(result=>{
      console.log(result);
      if(result.nModified){
        students_collection.bulkWrite(optionalCourses.map( function(p) { 
          console.log(`${p._id}`,p.category);
          return { updateOne:{
                        filter: {_id: `${p._id}`},
                        update: {
                          $pull:{
                            "incompleted":{category:{$in:p.category}},
                          },
  
                        }
                      
          }}
  
        }))
        .then(result=>{
          console.log(result);
          res.send(true);
        })
      }
    })
  }
})

// --------------querry for finding the courses from customised list ehich assign to him the advisor------
db.collection.aggregate([
  {
    "$match": {_id: "spring22"}
  },
  {"$unwind": "$customiseList"},
  {
    "$group": {
      "_id": "$customiseList.eligibleStudents",
      crs: { "$push": "$customiseList._id._id"}
    }
  },
  {
    "$match": {
      "_id": {$in: ["6"]}}
  },
  {
    "$group": {
      "_id": null,
      courses: {
        "$push": { $arrayElemAt: ["$crs",0]}
      }}},
])

//------------edit in a student's offered courses------
db.collection.update({
  _id: "summer22",
  
},
{
  $pull: {
    "customisedCourse.$[elem].eligibles": 2
  }
},
{
  arrayFilters: [
    {
      "elem._id._id": "cse102"
    }
  ]
},
)

//==================extra
app.post('/addRoutine/:type',(req,res)=>{
  const routineObj=req.body;
  const type=req.params.type;
  'routine'!==type?routine_collection.insertOne(routineObj).then(result=>{console.log("added document");
    if(result.acknowledged===true){
      res.send(true);
    }
    else{
      console.log("error");
    }})
  :routine_collection.replaceOne({_id:util.getNextSemester()},routineObj)
  .then(result=>{
    console.log("added document");
    if(result.acknowledged===true){
      res.send(true);
    }
    else{
      console.log("error");
    }
  });
})
//=====================================================================x=========================
// db.specificMonthDemo.aggregate([ 
//   {$project: {
//     StudentName: 1, 
    // StudentDateOfBirth:
    // {$month: '$StudentDateOfBirth'}
//   }}, 
//   {$match: {StudentDateOfBirth: 01}} 
// ]).pretty();


//---this querry is used in survey tracker js file. i just save it here. dont know it is important or not
fetch(`http://localhost:5000/qCheck`)
        .then(res=>res.json())
        .then(data=>{
            console.log(data);
            // console.log({_id:'Autumn22',customiseList:data.result_1[0].offeredCourse,removalCourses:data.result[0].removalCourses});
            const tempObj={_id:'Autumn22',customiseList:data.result_1[0].offeredCourse,removalCourses:data.result[0].removalCourses};
            fetch(`http://localhost:5000/replace`,{
                body:JSON.stringify(tempObj),
                method:"post",
                headers:{
                    "Content-Type":"application/json"
                }
            })
            .then(res=>res.json())
            .then(data=>{
                console.log(data);
            })
            // setAttendeesData(data.result.authors);
        })