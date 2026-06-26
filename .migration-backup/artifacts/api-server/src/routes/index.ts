import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import articlesRouter from "./articles";
import papersRouter from "./papers";
import categoriesRouter from "./categories";
import searchRouter from "./search";
import newsletterRouter from "./newsletter";
import submissionsRouter from "./submissions";
import adminRouter from "./admin";
import archiveRouter from "./archive";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(articlesRouter);
router.use(papersRouter);
router.use(categoriesRouter);
router.use(searchRouter);
router.use(newsletterRouter);
router.use(submissionsRouter);
router.use(adminRouter);
router.use(archiveRouter);

export default router;
