import express from "express";
import { userMiddleware } from "../middleware/userMiddleware.js";
import { companyCodeParamSchema, companyMongoIdParamSchema, companySchema, companyUpdateSchema } from "../validations/companyValidation.js";
import { createCompany, deleteCompany, getAllCompanies, getCompanyById, updateCompany } from "../controllers/companyController.js";

const companyRoutes = express.Router();

companyRoutes.post("/create", userMiddleware({ auth: true, roles: ["admin"], body: companySchema }), createCompany);
companyRoutes.get("/company/:companyId", userMiddleware({ auth: true, roles: ["admin"], params: companyCodeParamSchema }), getCompanyById);
companyRoutes.get("/all-company", userMiddleware({ auth: true, roles: ["superadmin"] }), getAllCompanies);
companyRoutes.put("/company/:id", userMiddleware({ auth: true, roles: ["admin"], params: companyMongoIdParamSchema, body: companyUpdateSchema }), updateCompany);
companyRoutes.delete("/company/:id", userMiddleware({ auth: true, roles: ["superadmin", "admin"], params: companyMongoIdParamSchema, }), deleteCompany);

export default companyRoutes;