import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin.js";
import articlesRouter from "./articles.js";
import papersRouter from "./papers.js";
import categoriesRouter from "./categories.js";
import tagsRouter from "./tags.js";
import authorsRouter from "./authors.js";
import searchRouter from "./search.js";
import submissionsRouter from "./submissions.js";
import newsletterRouter from "./newsletter.js";
import statsRouter from "./stats.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(articlesRouter);
router.use(papersRouter);
router.use(categoriesRouter);
router.use(tagsRouter);
router.use(authorsRouter);
router.use(searchRouter);
router.use(submissionsRouter);
router.use(newsletterRouter);
router.use(statsRouter);

export default router;
