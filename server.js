require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const connectDatabase = require("./database");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "50kb" }));

// ======================================================
// 1. CORS CONFIGURATION
// ======================================================

const allowedOrigins = new Set([
    "http://localhost:1234",
    "http://127.0.0.1:1234",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]);

if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL
        .split(",")
        .map(origin => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean)
        .forEach(origin => allowedOrigins.add(origin));
}

app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, "");

        if (allowedOrigins.has(normalizedOrigin)) {
            return callback(null, true);
        }

        console.warn("Blocked CORS origin:", normalizedOrigin);

        return callback(new Error("Origin not allowed"));
    },

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ],

    credentials: false,
    optionsSuccessStatus: 204
}));

// ======================================================
// 2. SWAGGER CONFIGURATION
// ======================================================

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Team Patent API",
            version: "1.0.0",
            description:
                "Team Patent API for administrator authentication, member profiles, scoring, and leaderboard management."
        },

        servers: [
            {
                url: "https://team-patent.onrender.com",
                description: "Live Render Backend"
            }
        ],

        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },

    apis: ["./server.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// ======================================================
// 3. DATABASE SCHEMAS
// ======================================================

const adminSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["admin"],
            default: "admin"
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const memberSchema = new mongoose.Schema(
    {
        memberCode: {
            type: String,
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        role: {
            type: String,
            required: true
        },

        image: {
            type: String,
            default: ""
        },

        about: {
            type: String,
            default: ""
        },

        strengths: {
            type: [String],
            default: []
        },

        quote: {
            type: String,
            default: ""
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const scoreFields = [
    "workCapability",
    "logic",
    "innovation",
    "teamwork",
    "delivery"
];

const scoreSchema = new mongoose.Schema(
    {
        memberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Member",
            required: true,
            unique: true
        },

        workCapability: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        logic: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        innovation: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        teamwork: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        delivery: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        workHours: {
            type: Number,
            default: 0,
            min: 0
        },

        completedTasks: {
            type: Number,
            default: 0,
            min: 0
        },

        notes: {
            type: String,
            default: "",
            maxlength: 2000
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

const Admin = mongoose.model("Admin", adminSchema);
const Member = mongoose.model("Member", memberSchema);
const Score = mongoose.model("Score", scoreSchema);

// ======================================================
// 4. INITIAL MEMBER PROFILES
// ======================================================

const initialMembers = [
    {
        memberCode: "AI001",
        name: "Anirudha K",
        role: "Team Leader / Lead Developer",
        image: "/mem/Anirudha.webp",
        about:
            "Anirudha coordinates the team's direction, development priorities, and collaboration across technical workstreams. He has contributed to multidisciplinary project work, including an AI-powered water-quality analysis and contaminant-risk prediction project. His experience combines data-driven analysis, software development, and sensor-oriented ideas. His leadership focuses on turning research into practical prototypes, keeping members aligned, planning development priorities, and connecting software and hardware efforts.",
        strengths: [
            "Project coordination",
            "Technical problem-solving",
            "Planning",
            "Innovation",
            "Cross-team integration",
            "AI/ML project development"
        ],
        quote:
            "A leader does not build alone; a leader helps every strength in the team become part of the solution."
    },

    {
        memberCode: "AI002",
        name: "Nisarga J",
        role: "Team Lead / Co-Developer",
        image: "/mem/nisarga.webp",
        about:
            "Nisarga is described as creative, innovative, hardworking, responsive, and friendly toward team members. She supports others, contributes ideas, offers explanations, and remains engaged throughout project completion. Her supportive attitude helps create an environment where members can ask questions, exchange ideas, and continue working toward shared goals.",
        strengths: [
            "Creativity",
            "Innovation",
            "Reliability",
            "Teamwork",
            "Approachability",
            "Sustained support"
        ],
        quote:
            "When support grows stronger, the team grows stronger."
    },

    {
        memberCode: "AI003",
        name: "Ullas D S",
        role: "Backend Developer",
        image: "/mem/ullas.webp",
        about:
            "Ullas is a logical thinker and careful analyzer. He approaches problems by examining how they work, identifying underlying issues, and considering practical ways to solve them. These qualities are valuable for backend logic, system behaviour, data handling, and dependable technical implementation.",
        strengths: [
            "Logical reasoning",
            "Analysis",
            "Structured problem-solving",
            "Technical thinking",
            "Backend development"
        ],
        quote:
            "Strong systems begin with clear logic and thoughtful analysis."
    },

    {
        memberCode: "AI004",
        name: "Ganesh H R",
        role: "Frontend Developer",
        image: "/mem/Ganesh_H_R.webp",
        about:
            "Ganesh is described as hardworking and a logical analyzer who also has knowledge of agriculture. His analytical approach helps the team understand requirements and evaluate practical use cases. His agricultural knowledge adds a useful perspective when projects address real-world agricultural needs.",
        strengths: [
            "Hard work",
            "Logical analysis",
            "Practical thinking",
            "Agricultural knowledge",
            "Frontend development"
        ],
        quote:
            "Work with logic, learn from the field, and build for real needs."
    },

    {
        memberCode: "AI005",
        name: "Deviprasad Shetty U",
        role: "Frontend Developer",
        image: "/mem/Deviprasad_Shetty_U.webp",
        about:
            "Deviprasad is described as the team's lucky charm: enthusiastic, charming, positive, and motivating to others. His energy helps make collaboration more enjoyable and can lift the group's spirit while the team works toward its goals.",
        strengths: [
            "Enthusiasm",
            "Positive energy",
            "Motivation",
            "Approachability",
            "Team spirit",
            "Frontend development"
        ],
        quote:
            "Good energy is contagious—and it helps good work move forward."
    },

    {
        memberCode: "AI006",
        name: "Rishi N",
        role: "Backend Developer",
        image: "/mem/Rishi.webp",
        about:
            "Rishi brings an enthusiastic and relaxed approach to the team. He is described as someone who thinks about challenges in a cool, composed, and practical way. His calm attitude helps maintain a positive working atmosphere while the team explores alternatives and works through development challenges.",
        strengths: [
            "Enthusiasm",
            "Composure",
            "Positive attitude",
            "Relaxed problem-solving",
            "Backend development"
        ],
        quote:
            "Stay cool under pressure; every challenge has another angle."
    },

    {
        memberCode: "AI007",
        name: "Pavan P Mesta",
        role: "Electric Circuit Designer",
        image: "/mem/pavan.webp",
        about:
            "Pavan is described as knowledgeable about electrical components and modern materials. He brings component knowledge and practical execution skills to circuit-related work. His profile highlights component selection, circuit design, and practical hardware implementation.",
        strengths: [
            "Electrical-component knowledge",
            "Modern materials awareness",
            "Practical execution",
            "Circuit design",
            "Hardware implementation"
        ],
        quote:
            "Quiet preparation, precise execution, visible results."
    },

    {
        memberCode: "AI008",
        name: "Ankith A R",
        role: "Electric Component Integrator",
        image: "/mem/ankith.webp",
        about:
            "Ankith supports the hands-on integration that brings electrical components together. His work includes soldering and making physical connections so circuit components operate as a connected system. His role helps turn a design into a working prototype.",
        strengths: [
            "Hands-on integration",
            "Soldering",
            "Electrical connections",
            "Hardware assembly",
            "Prototype support"
        ],
        quote:
            "A design becomes a working system when every connection is made right."
    }
];

// ======================================================
// 5. ADMIN AUTHENTICATION
// ======================================================

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message: "Too many login attempts. Try again later."
    }
});

function requireAdmin(req, res, next) {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Administrator login required"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ["HS256"]
            }
        );

        if (decoded.role !== "admin" || !decoded.sub) {
            return res.status(403).json({
                message: "Administrator access required"
            });
        }

        req.adminId = decoded.sub;
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired login session"
        });
    }
}

// ======================================================
// 6. ADMIN LOGIN
// ======================================================

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Administrator login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: ReplaceWithYourPassword
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Incorrect credentials
 */
app.post(
    "/api/auth/login",
    loginLimiter,
    async (req, res, next) => {
        try {
            const { username, password } = req.body || {};

            if (
                typeof username !== "string" ||
                typeof password !== "string" ||
                username.length > 100 ||
                password.length > 200
            ) {
                return res.status(400).json({
                    message: "Enter a valid username and password"
                });
            }

            const admin = await Admin.findOne({
                username,
                isActive: true
            });

            if (
                !admin ||
                !(await bcrypt.compare(
                    password,
                    admin.passwordHash
                ))
            ) {
                return res.status(401).json({
                    message: "Incorrect username or password"
                });
            }

            const token = jwt.sign(
                {
                    role: "admin"
                },
                process.env.JWT_SECRET,
                {
                    subject: admin._id.toString(),
                    expiresIn: "2h",
                    algorithm: "HS256"
                }
            );

            res.set("Cache-Control", "no-store");

            res.json({
                message: "Login successful",
                token,
                username: admin.username
            });
        } catch (error) {
            next(error);
        }
    }
);

// ======================================================
// 7. VALIDATE ADMIN SESSION
// ======================================================

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Validate administrator session
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Administrator session is valid
 *       401:
 *         description: Invalid session
 */
app.get("/api/auth/me", requireAdmin, async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.adminId)
            .select("username role isActive");

        if (!admin || !admin.isActive) {
            return res.status(401).json({
                message: "Administrator account unavailable"
            });
        }

        res.set("Cache-Control", "no-store");
        res.json({ admin });
    } catch (error) {
        next(error);
    }
});

// ======================================================
// 8. GET ALL MEMBER PROFILES
// ======================================================

/**
 * @swagger
 * /api/members:
 *   get:
 *     tags: [Members]
 *     summary: Get all active member profiles
 *     responses:
 *       200:
 *         description: Member profiles
 */
app.get("/api/members", async (req, res, next) => {
    try {
        const members = await Member.find({
            isActive: true
        })
            .select(
                "memberCode name role image about strengths quote"
            )
            .sort({ memberCode: 1 })
            .lean();

        res.set("Cache-Control", "no-store");

        res.json({
            count: members.length,
            members
        });
    } catch (error) {
        next(error);
    }
});

// ======================================================
// 9. GET ONE MEMBER PROFILE
// ======================================================

/**
 * @swagger
 * /api/members/{id}:
 *   get:
 *     tags: [Members]
 *     summary: Get one member profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member profile
 *       400:
 *         description: Invalid member ID
 *       404:
 *         description: Member not found
 */
app.get("/api/members/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid member ID"
            });
        }

        const member = await Member.findOne({
            _id: req.params.id,
            isActive: true
        })
            .select(
                "memberCode name role image about strengths quote"
            )
            .lean();

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        res.json({ member });
    } catch (error) {
        next(error);
    }
});

// ======================================================
// 10. DEACTIVATE MEMBER — ADMIN ONLY
// ======================================================

/**
 * @swagger
 * /api/members/{id}:
 *   delete:
 *     tags: [Members]
 *     summary: Deactivate a member
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member deactivated
 *       401:
 *         description: Administrator login required
 */
app.delete(
    "/api/members/:id",
    requireAdmin,
    async (req, res, next) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    message: "Invalid member ID"
                });
            }

            const member = await Member.findByIdAndUpdate(
                req.params.id,
                {
                    isActive: false
                },
                {
                    new: true
                }
            );

            if (!member) {
                return res.status(404).json({
                    message: "Member not found"
                });
            }

            res.json({
                message: "Member deactivated successfully"
            });
        } catch (error) {
            next(error);
        }
    }
);

// ======================================================
// 11. LEADERBOARD
// ======================================================

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Get ranked members and percentages
 *     responses:
 *       200:
 *         description: Calculated leaderboard
 */
app.get("/api/leaderboard", async (req, res, next) => {
    try {
        const members = await Member.find({
            isActive: true
        }).lean();

        const scores = await Score.find({
            memberId: {
                $in: members.map(member => member._id)
            }
        }).lean();

        const scoreMap = new Map(
            scores.map(score => [
                score.memberId.toString(),
                score
            ])
        );

        const leaderboard = members.map(member => {
            const score =
                scoreMap.get(member._id.toString()) || {};

            const categories = Object.fromEntries(
                scoreFields.map(field => [
                    field,
                    Number(score[field] || 0)
                ])
            );

            const total = scoreFields.reduce(
                (sum, field) =>
                    sum + Number(score[field] || 0),
                0
            );

            return {
                memberId: member._id,
                memberCode: member.memberCode,
                name: member.name,
                role: member.role,
                image: member.image,
                scores: categories,

                percentage:
                    Math.round(
                        (total / scoreFields.length) * 100
                    ) / 100,

                workHours: Number(score.workHours || 0),
                completedTasks: Number(score.completedTasks || 0),
                updatedAt: score.updatedAt || null
            };
        });

        leaderboard.sort(
            (a, b) =>
                b.percentage - a.percentage ||
                a.name.localeCompare(b.name)
        );

        leaderboard.forEach((member, index) => {
            member.rank = index + 1;
        });

        res.set("Cache-Control", "no-store");

        res.json({
            leaderboard,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

// ======================================================
// 12. GET PUBLIC SCORES
// ======================================================

/**
 * @swagger
 * /api/scores/{memberId}:
 *   get:
 *     tags: [Scores]
 *     summary: Get public score data
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public score record
 */
app.get("/api/scores/:memberId", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.memberId)) {
            return res.status(400).json({
                message: "Invalid member ID"
            });
        }

        const score = await Score.findOne({
            memberId: req.params.memberId
        })
            .select("-notes")
            .lean();

        res.set("Cache-Control", "no-store");
        res.json({ score: score || null });
    } catch (error) {
        next(error);
    }
});

// ======================================================
// 13. UPDATE SCORES — ADMIN ONLY
// ======================================================

/**
 * @swagger
 * /api/scores/{memberId}:
 *   put:
 *     tags: [Scores]
 *     summary: Create or update a member's scores
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workCapability:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               logic:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               innovation:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               teamwork:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               delivery:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               workHours:
 *                 type: number
 *                 minimum: 0
 *               completedTasks:
 *                 type: number
 *                 minimum: 0
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Scores saved successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Administrator login required
 */
app.put(
    "/api/scores/:memberId",
    requireAdmin,
    async (req, res, next) => {
        try {
            const { memberId } = req.params;

            if (!mongoose.isValidObjectId(memberId)) {
                return res.status(400).json({
                    message: "Invalid member ID"
                });
            }

            const member = await Member.findOne({
                _id: memberId,
                isActive: true
            });

            if (!member) {
                return res.status(404).json({
                    message: "Member not found"
                });
            }

            const body = req.body || {};
            const update = {};

            for (const field of scoreFields) {
                if (body[field] !== undefined) {
                    const value = body[field];

                    if (
                        typeof value !== "number" ||
                        !Number.isFinite(value) ||
                        value < 0 ||
                        value > 100
                    ) {
                        return res.status(400).json({
                            message:
                                `${field} must be a number between 0 and 100`
                        });
                    }

                    update[field] = value;
                }
            }

            for (const field of [
                "workHours",
                "completedTasks"
            ]) {
                if (body[field] !== undefined) {
                    const value = body[field];

                    if (
                        typeof value !== "number" ||
                        !Number.isFinite(value) ||
                        value < 0 ||
                        value > 1000000
                    ) {
                        return res.status(400).json({
                            message:
                                `${field} must be a non-negative number`
                        });
                    }

                    update[field] = value;
                }
            }

            if (body.notes !== undefined) {
                if (
                    typeof body.notes !== "string" ||
                    body.notes.length > 2000
                ) {
                    return res.status(400).json({
                        message: "Invalid notes"
                    });
                }

                update.notes = body.notes;
            }

            if (Object.keys(update).length === 0) {
                return res.status(400).json({
                    message: "No valid score fields supplied"
                });
            }

            update.updatedAt = new Date();

            const score = await Score.findOneAndUpdate(
                {
                    memberId: member._id
                },
                {
                    $set: update,
                    $setOnInsert: {
                        memberId: member._id
                    }
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            );

            res.set("Cache-Control", "no-store");

            res.json({
                message: "Scores saved successfully",
                score
            });
        } catch (error) {
            next(error);
        }
    }
);

// ======================================================
// 14. GET FULL SCORE RECORD — ADMIN ONLY
// ======================================================

/**
 * @swagger
 * /api/admin/scores/{memberId}:
 *   get:
 *     tags: [Scores]
 *     summary: Get full score record including private notes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full score record
 */
app.get(
    "/api/admin/scores/:memberId",
    requireAdmin,
    async (req, res, next) => {
        try {
            if (!mongoose.isValidObjectId(req.params.memberId)) {
                return res.status(400).json({
                    message: "Invalid member ID"
                });
            }

            const score = await Score.findOne({
                memberId: req.params.memberId
            }).lean();

            res.set("Cache-Control", "no-store");
            res.json({ score: score || null });
        } catch (error) {
            next(error);
        }
    }
);

// ======================================================
// 15. HEALTH CHECK
// ======================================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Check API and database health
 *     responses:
 *       200:
 *         description: API is running
 *       503:
 *         description: Database is unavailable
 */
app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({
        status: connected ? "ok" : "degraded",
        service: "Team Patent API",
        database: connected ? "connected" : "disconnected"
    });
});

// ======================================================
// 16. ROOT ROUTE
// ======================================================

app.get("/", (req, res) => {
    res.json({
        service: "Team Patent API",
        status: "running",
        documentation: "/api-docs",
        health: "/api/health"
    });
});

// ======================================================
// 17. ERROR HANDLING
// ======================================================

app.use((req, res) => {
    res.status(404).json({
        message: "API endpoint not found"
    });
});

app.use((error, req, res, next) => {
    console.error("Request error:", error.message);

    if (error.message === "Origin not allowed") {
        return res.status(403).json({
            message: "Origin not allowed by CORS"
        });
    }

    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            message: "Invalid JSON request body"
        });
    }

    res.status(500).json({
        message: "Internal server error"
    });
});

// ======================================================
// 18. INITIALIZE MEMBER RECORDS
// ======================================================

async function initializeMembers() {
    for (const member of initialMembers) {
        await Member.updateOne(
            {
                name: member.name
            },
            {
                $setOnInsert: member
            },
            {
                upsert: true
            }
        );
    }

    console.log(
        `Member initialization complete: ${initialMembers.length} profiles`
    );
}

// ======================================================
// 19. INITIALIZE ADMIN ACCOUNT
// ======================================================

async function initializeAdmin() {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        throw new Error(
            "ADMIN_USERNAME and ADMIN_PASSWORD must be configured"
        );
    }

    if (password.length < 12) {
        throw new Error(
            "ADMIN_PASSWORD must contain at least 12 characters"
        );
    }

    const existingAdmin = await Admin.findOne({
        username
    });

    if (existingAdmin) {
        console.log("Existing administrator account preserved");
        return;
    }

    await Admin.create({
        username,
        passwordHash: await bcrypt.hash(password, 12),
        role: "admin",
        isActive: true
    });

    console.log("Initial administrator created");
}

// ======================================================
// 20. START SERVER
// ======================================================

async function startServer() {
    if (
        !process.env.JWT_SECRET ||
        process.env.JWT_SECRET.length < 32
    ) {
        throw new Error(
            "JWT_SECRET must contain at least 32 characters"
        );
    }

    await connectDatabase();
    await initializeMembers();
    await initializeAdmin();

    const PORT = Number(process.env.PORT) || 5000;

    app.listen(PORT, "0.0.0.0", () => {
        const baseUrl =
            process.env.RENDER_EXTERNAL_URL ||
            `http://localhost:${PORT}`;

        console.log(`Team Patent API listening on port ${PORT}`);
        console.log(`Swagger UI: ${baseUrl}/api-docs`);
        console.log(`Health check: ${baseUrl}/api/health`);
    });
}

startServer().catch(error => {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
});