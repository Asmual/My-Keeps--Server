"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
router.route('/profile')
    .get(userController_1.getUserProfile)
    .patch(userController_1.updateUserProfile);
exports.default = router;
