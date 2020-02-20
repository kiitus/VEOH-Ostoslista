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
module.exports = item_model;