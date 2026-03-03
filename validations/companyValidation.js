import Joi from "joi";
import mongoose from "mongoose";
const objectId = () => 
    Joi.string().custom((value, helpers) => {
        if(!mongoose.Types.ObjectId.isValid(value)) return helpers.message("Invalid Id");
        return value;
    }, 'ObjectId validation');

export const companySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().min(10).max(500).required(),
    address: Joi.string().min(5).max(200).required(),
    website: Joi.string().uri().required(),
    companyId: Joi.string().min(2).max(50).required(),
});

export const companyUpdateSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().min(10).max(500),
    address: Joi.string().min(5).max(200),
    website: Joi.string().uri(),
    companyId: Joi.string().min(2).max(50),
}).min(1);

export const companyMongoIdParamSchema = Joi.object({
    id: objectId().required()
}); 

export const companyCodeParamSchema = Joi.object({
  companyId: Joi.string().min(2).max(50).required(),
});