const express = require(`express`);
const body_parser = require('body-parser');
const PORT = process.env.PORT || 8080;
const session = require('express-session');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const item_schema = new Schema(
    {
        text:{
            type:String,
            required:true
        },
        amount:{
            type:String,
            required:true
        },
        image:{
            type:String,
            required:false
        }
    }
)

const item_model = new mongoose.model(`item`, item_schema);

const list_schema = new Schema({
    text:{
        type: String,
        required: true
    },
    items:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"item",
        req:true
    }]

})

const list_model = new mongoose.model(`list`, list_schema);
const user_schema = new Schema({
    name: {
        type: String,
        required: true
    },
    lists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: `list`,
        req: true
    }]
});
const user_model = mongoose.model('user', user_schema);



let app = express();

app.use(body_parser.urlencoded({
    extended: true
}));

app.use(session({
    secret: '1234qwerty',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000000
    }
}));

const is_logged_handler = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

app.use((req,res,next)=>
{
    if (!req.session.user) {
       return next();
    }
    user_model.findById(req.session.user._id).then((user) =>
    {
        req.user = user;
        next();
    }
    ).catch((err)=>{
        console.log(err);
        res.redirect("/login");
    });

}
);


app.use((req,res,next)=>
{
    if (!req.session.list) {
        return next();
     }
    list_model.findById(req.session.list._id).then((list) =>
    {
        req.list = list;
        next();
    })
})

app.use(express.static('public'));


app.use((req,res,next)=>{
    console.log("Metodi "+ req.method+ " Path "+ req.path);
    next();
});

app.get('/login', (req, res, next) => {
    console.log('user: ', req.session.user)
    res.write(`
    <html>
    <head><meta charset="UTF-8">
    <link rel="stylesheet" type="text/css"   href="/css/style.css">
    </head>
    <body>
    <h1>Shoppinglist application by Teemu</h1>

        <form action="/login" method="POST">
            <input type="text" name="user_name">
            <button type="submit">Log in</button>
        </form>
        <form action="/register" method="POST">
            <input type="text" name="user_name">
            <button type="submit">Register</button>
        </form>
    </body>
    <html>
    `);
    res.end();
});

app.post('/login', (req, res, next) => {
    const user_name = req.body.user_name;
    user_model.findOne({
        name: user_name
    }).then((user) => {
        if (user) {
            req.session.user = user;
            return res.redirect('/');
        }

        res.redirect('/login');
    });
});



app.post('/register', (req, res, next) => {
    const user_name = req.body.user_name;
    console.log("Hei");
    user_model.findOne({
        name: user_name
    }).then((user) => {
        if (user) {
            console.log('User name already registered');
            return res.redirect('/login');
        }

        let new_user = new user_model({
            name: user_name,
            lists: []
        });
        new_user.save().then(() => {
            return res.redirect('/login');
        });

    });
});


app.get('/', is_logged_handler, (req, res, next) => {
    const user = req.user;
    user.populate(`lists`).execPopulate().then(() =>{
        
    res.write(`
    <html>
    <head><meta charset="UTF-8">
    <link rel="stylesheet" type="text/css"   href="/css/style.css">
    </head>
    <body>
    <h1>Shoppinglist application by Teemu</h1>
        Logged in as user: ${user.name}
        <form action="/logout" method="POST">
            <button type="submit">Log out</button>
    </form><h2>Shoppinglists</h2>`);

    user.lists.forEach(list => {
         res.write(`<a href="\shoppinglist\\${list._id}">${list.text}</a>`);
        res.write(`<form action="delete-list" method="POST">
        <input type="hidden" name="list_id" value="${list._id}">
        <button type="submit"> Delete list</button>
        </form>`
        )
    });
    res.write(`

        <form action="/add-list" method="POST">
        <input type="text" name="list">
        <button type="submit">Add shoppinglist</button>
        </form>

    </body>
    </html>
    `);
    res.end();
    });


});


app.post('/logout', (req, res, next) => {
    req.session.destroy();
    res.redirect('/login');
});

app.post(`/add-list`,(req,res,next)=>
{
    const user = req.user;



    let new_list = list_model(
        {
            text: req.body.list,
            items: []
        }
    );
    new_list.save().then(()=>
    {
        console.log("list saved");
        user.lists.push(new_list);
        user.save().then(()=>
        {
            return res.redirect("/");
        }
        );
        
    });
});

app.post(`/delete-list`,(req,res,next)=>
{
const user = req.user;
const list_id_to_delete = req.body.list_id;


list_model.findOne(
    {
        _id: list_id_to_delete
    }
).then((list)=>
{
    
    //item_model.remove(
        item_model.deleteMany(
        {
            _id: {$in: list.items}
        }
    ).then(()=>
    {
         //remove item form user.notes
        const updated_lists = user.lists.filter((list_id)=>
        {
            return list_id != list_id_to_delete;    
        });
        user.list = updated_lists;

        user.save().then(()=>
        {
            list_model.findByIdAndRemove(list_id_to_delete).then(()=>
            {
                res.redirect(`/`);
            })
        })
        
    })
})
})




app.get(`/shoppinglist/:id`,is_logged_handler,(req,res,next)=>
 {
     const user = req.user;
     list_model.findOne({
        _id: req.params.id

    }).then((list)=>
    {
          
        list.populate(`items`).execPopulate().then(()=>
        {
            session.list = list;
            lista=`<html><head><meta charset="UTF-8">
            <link rel="stylesheet" type="text/css"   href="/css/style.css">
            </head>
             <body> <h1>Shoppinglist application by Teemu</h1>
            Logged in as user: ${user.name}
            <form action="/logout" method="POST">
                <button type="submit">Log out</button>
             </form>
            <h2>Shoppinglist: ${list.text}</h2>`
            lista+=`<ul>`;

        list.items.forEach((value,index)=>
        {   
            lista += `<form action="/deleteItem" method="POST"> `;
            lista+=`<li>Product: ${value.text} Amount:  ${value.amount}`;
            //style="width:100px;height:100px;"
            //style="width:10%;height:10%;"
            lista+=`<input type="hidden" name="id" value="${value._id}">`;
            lista+=`<input type="hidden" name="listId" value="${list._id} ">`;
            lista+=`<button type="submit" formaction="/decrease" style="margin-left: 30px;">-</button>`;
            lista+=`<button type="submit" formaction="/increase">+</button>`;
           lista+=`<button type="submit" style="margin-left: 10px;">Delete</button></li> </form>`;
           lista+=`</br><img src="${value.image}" style="width:100px;height:100px;">`
        });
        lista += `</ul>`;
       
        res.write(`   ${lista}`);
        res.write(`
        <form action="/addItem" method="POST">
        Name of the item
        <input type="text" name="item">
        Number of items
        <input type="number" name="amount">
        Image of the item
        <input type="text" name="image" value="https://plusprint.fi/sites/default/files/media/kassi.jpg">
        <input type="hidden" value="${list._id}" name="id">
         <button type="submit">Add Item</button>
        </form> <h3><a href="/">Back to lists</a> </h3></body></html>
        `)
        res.end();
    });
});
 });
    

app.post("/addItem",(req,res,next)=>
{
    const user = req.user;
    const list = session.list;
    console.log(list._id);

    let new_item = item_model(
        {
            text: req.body.item,
            amount: req.body.amount,
            image: req.body.image
         }
    );
    new_item.save().then(()=>
    {
        console.log("item saved");
       list.items.push(new_item);
    list.save().then(()=>
                {
                    return res.redirect(`/shoppinglist/${list._id}`);
                });
            });
        });
    
        
app.post("/deleteItem",(req,res,next)=>
{
    
    const user = req.user;
const item_id_to_delete = req.body.id;
const list = session.list;

//remove item form user.notes
const updated_lists = list.items.filter((item_id)=>
{
    return item_id != item_id_to_delete;
});
list.items = updated_lists;

list.save().then(()=>
{
    item_model.findByIdAndRemove(item_id_to_delete).then(()=>
        {
            console.log("Ei deleten loppuun");
            return res.redirect(`/shoppinglist/${list._id}`);
        });
   
}
);

}

)

app.post("/increase",(req,res,next)=>
{
    const user = req.user;
    const item_id_to_increase = req.body.id;
    const list = session.list;

    item_model.findOne({
        _id: item_id_to_increase
    }).then((item)=>{
        item.amount++;
        item.save();

    }).then(()=>{
        console.log(list._id);
    return res.redirect(`/shoppinglist/${list._id}`);
})
});

app.post("/decrease",(req,res,next)=>
{
    const user = req.user;
    const item_id_to_decrease = req.body.id;
    const list = session.list;

    item_model.findOne({
        _id: item_id_to_decrease
    }).then((item)=>{
        item.amount--;
        item.save();

    }).then(()=>{
        console.log(list._id);
    return res.redirect(`/shoppinglist/${list._id}`);
})
})

app.use((req,res,next)=>
{
    console.log("404");
    res.status(404);
    res.send("404");
    res.end();
});

const mongoose_url ="mongodb+srv://Kiitus:8sf4DhhMYzF4bgUV@cluster0-sseei.mongodb.net/test?retryWrites=true&w=majority";

mongoose.connect(mongoose_url, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
}).then(() => {
    console.log('Mongoose connected');
    console.log('Start Express server');
    app.listen(PORT);
});