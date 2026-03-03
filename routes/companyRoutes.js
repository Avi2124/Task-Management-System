import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { companyCodeParamSchema, companyMongoIdParamSchema, companySchema, companyUpdateSchema } from "../validations/companyValidation.js";
import { createCompany, deleteCompany, getAllCompanies, getCompanyById, updateCompany } from "../controllers/companyController.js";

const companyRoutes = express.Router();

companyRoutes.post("/create", userMiddleware({auth: true, roles: ["superadmin"], body: companySchema}), createCompany);
companyRoutes.get("/company/:companyId", userMiddleware({auth: true, body: companyCodeParamSchema}), getCompanyById);
companyRoutes.get("/all-company", userMiddleware({auth: true, roles: ["superadmin"], body: companyCodeParamSchema}), getAllCompanies);
companyRoutes.put("/company/:id", userMiddleware({auth: true, roles: ["superadmin"], params: companyMongoIdParamSchema, body: companyUpdateSchema}), updateCompany);
companyRoutes.delete("/company/:id", userMiddleware({auth: true, roles: ["superadmin"], params: companyMongoIdParamSchema}), deleteCompany);


export default companyRoutes;