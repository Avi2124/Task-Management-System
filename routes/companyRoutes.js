import express from "express";
import { userMiddleware, userMiddlewareAllowExpiredPlan } from "../middleware/userMiddleware.js";
import { companyCodeParamSchema, companyMongoIdParamSchema, companySchema, companyUpdateSchema, renewPlanSchema } from "../validations/companyValidation.js";
import { createCompany, createRenewPlanCheckout, deleteCompany, getAllCompanies, getCompanyById, getRenewalPlans, updateCompany } from "../controllers/companyController.js";

const companyRoutes = express.Router();

companyRoutes.post("/create", userMiddleware({ auth: true, roles: ["admin"], body: companySchema }), createCompany);
companyRoutes.get("/company/:companyId", userMiddleware({ auth: true, roles: ["superadmin", "admin"], params: companyCodeParamSchema }), getCompanyById);
companyRoutes.get("/all-company", userMiddleware({ auth: true, roles: ["superadmin"] }), getAllCompanies);
companyRoutes.put("/company/:id", userMiddleware({ auth: true, roles: ["admin"], params: companyMongoIdParamSchema, body: companyUpdateSchema }), updateCompany);
companyRoutes.delete("/company/:id", userMiddleware({ auth: true, roles: ["superadmin", "admin"], params: companyMongoIdParamSchema, }), deleteCompany);
// renew routes
companyRoutes.get("/renew/plans",userMiddlewareAllowExpiredPlan({ auth: true, roles: ["admin"] }),getRenewalPlans);
companyRoutes.post("/renew/checkout",userMiddlewareAllowExpiredPlan({ auth: true, roles: ["admin"], body: renewPlanSchema }),createRenewPlanCheckout);

export default companyRoutes;