"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const env_1 = require("../../shared/env");
exports.memoryUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: env_1.env.MAX_UPLOAD_MB * 1024 * 1024,
        files: 12,
    },
});
//# sourceMappingURL=uploads.js.map