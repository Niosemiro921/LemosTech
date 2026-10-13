"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
var demoPhone = '923000010';
var demoPassword = 'Demo@123';
var demoPasswordHash = bcrypt.hashSync(demoPassword, 12);
var demoProfiles = [
    { role: client_1.UserRole.CUSTOMER, email: 'cliente.demo@lemostech.test', fullName: 'Cliente Demo' },
    { role: client_1.UserRole.DRIVER, email: 'entregador.demo@lemostech.test', fullName: 'Entregador Demo', documentNumber: '0000000000A', vehicleType: 'MOTORCYCLE' },
    { role: client_1.UserRole.SUPPLIER, email: 'fornecedor.demo@lemostech.test', legalName: 'Distribuidora Demo', tradeName: 'Demo Gás', nif: '900000000', responsibleName: 'Responsável Demo' },
    { role: client_1.UserRole.ADMIN, email: 'admin.demo@lemostech.test' },
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var product, variants, _i, variants_1, variant, _a, demoProfiles_1, profile, existingUser, user, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, prisma.product.upsert({
                        where: { slug: 'gas-engarrafado' },
                        update: { name: 'Gás Engarrafado', active: true },
                        create: {
                            slug: 'gas-engarrafado',
                            name: 'Gás Engarrafado',
                            description: 'Catálogo de botijas de gás disponíveis para encomenda.',
                        },
                    })];
                case 1:
                    product = _c.sent();
                    variants = [
                        { sku: 'GE-6KG', name: 'Botija 6 KG', weightKg: 6, unitPrice: 3500 },
                        { sku: 'GE-12KG', name: 'Botija 12 KG', weightKg: 12, unitPrice: 7000 },
                        { sku: 'GE-45KG', name: 'Botija 45 KG', weightKg: 45, unitPrice: 18000 },
                    ];
                    _i = 0, variants_1 = variants;
                    _c.label = 2;
                case 2:
                    if (!(_i < variants_1.length)) return [3 /*break*/, 5];
                    variant = variants_1[_i];
                    return [4 /*yield*/, prisma.productVariant.upsert({
                            where: { sku: variant.sku },
                            update: {
                                productId: product.id,
                                name: variant.name,
                                weightKg: variant.weightKg,
                                unitPrice: variant.unitPrice,
                                active: true,
                            },
                            create: __assign({ productId: product.id }, variant),
                        })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    _a = 0, demoProfiles_1 = demoProfiles;
                    _c.label = 6;
                case 6:
                    if (!(_a < demoProfiles_1.length)) return [3 /*break*/, 18];
                    profile = demoProfiles_1[_a];
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { phone: demoPhone, role: profile.role },
                        })];
                case 7:
                    existingUser = _c.sent();
                    if (!(existingUser !== null && existingUser !== void 0)) return [3 /*break*/, 8];
                    _b = existingUser;
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, prisma.user.create({
                        data: {
                            phone: demoPhone,
                            email: profile.email,
                            passwordHash: demoPasswordHash,
                            role: profile.role,
                            status: client_1.AccountStatus.ACTIVE,
                        },
                    })];
                case 9:
                    _b = _c.sent();
                    _c.label = 10;
                case 10:
                    user = _b;
                    return [4 /*yield*/, prisma.user.update({
                            where: { id: user.id },
                            data: {
                                email: profile.email,
                                passwordHash: demoPasswordHash,
                                status: client_1.AccountStatus.ACTIVE,
                            },
                        })];
                case 11:
                    _c.sent();
                    if (!(profile.role === client_1.UserRole.CUSTOMER)) return [3 /*break*/, 13];
                    return [4 /*yield*/, prisma.customerProfile.upsert({
                            where: { userId: user.id },
                            update: { fullName: profile.fullName },
                            create: { userId: user.id, fullName: profile.fullName },
                        })];
                case 12:
                    _c.sent();
                    _c.label = 13;
                case 13:
                    if (!(profile.role === client_1.UserRole.DRIVER)) return [3 /*break*/, 15];
                    return [4 /*yield*/, prisma.driverProfile.upsert({
                            where: { userId: user.id },
                            update: {
                                fullName: profile.fullName,
                                documentNumber: profile.documentNumber,
                                vehicleType: profile.vehicleType,
                            },
                            create: {
                                userId: user.id,
                                fullName: profile.fullName,
                                documentNumber: profile.documentNumber,
                                vehicleType: profile.vehicleType,
                            },
                        })];
                case 14:
                    _c.sent();
                    _c.label = 15;
                case 15:
                    if (!(profile.role === client_1.UserRole.SUPPLIER)) return [3 /*break*/, 17];
                    return [4 /*yield*/, prisma.supplierProfile.upsert({
                            where: { userId: user.id },
                            update: {
                                legalName: profile.legalName,
                                tradeName: profile.tradeName,
                                nif: profile.nif,
                                responsibleName: profile.responsibleName,
                            },
                            create: {
                                userId: user.id,
                                legalName: profile.legalName,
                                tradeName: profile.tradeName,
                                nif: profile.nif,
                                responsibleName: profile.responsibleName,
                            },
                        })];
                case 16:
                    _c.sent();
                    _c.label = 17;
                case 17:
                    _a++;
                    return [3 /*break*/, 6];
                case 18:
                    console.log("Cat\u00E1logo inicial carregado. Utilizadores demo criados com o n\u00FAmero ".concat(demoPhone, " e palavra-passe ").concat(demoPassword, "."));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (error) {
    console.error(error);
    process.exitCode = 1;
})
    .finally(function () { return prisma.$disconnect(); });
