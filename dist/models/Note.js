"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Note = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CheckItemSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
}, { _id: false });
const NoteSchema = new mongoose_1.Schema({
    title: { type: String, default: '', trim: true },
    content: { type: String, default: '' },
    color: {
        type: String,
        default: 'default',
        enum: [
            'default',
            'coral',
            'peach',
            'sand',
            'mint',
            'sage',
            'fog',
            'storm',
            'dusk',
            'blossom',
            'clay',
        ],
    },
    isPinned: { type: Boolean, default: false, index: true },
    isImportant: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    isTrashed: { type: Boolean, default: false, index: true },
    labels: [{ type: String, trim: true }],
    checklist: [CheckItemSchema],
    noteType: {
        type: String,
        default: 'text',
        enum: ['text', 'checklist', 'image', 'voice'],
        index: true,
    },
    images: [{ type: String }],
    audioUrl: { type: String, default: null },
    reminder: { type: Date, default: null },
    userId: { type: mongoose_1.Schema.Types.Mixed, default: null, index: true },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            if (ret._id) {
                ret.id = String(ret._id);
            }
            delete ret.__v;
            return ret;
        },
    },
});
exports.Note = mongoose_1.default.models.Note || mongoose_1.default.model('Note', NoteSchema);
exports.default = exports.Note;
