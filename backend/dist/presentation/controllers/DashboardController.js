"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
class DashboardController {
    getMetrics;
    constructor(getMetrics) {
        this.getMetrics = getMetrics;
    }
    get = async (req, res) => {
        const metrics = await this.getMetrics.exec(req.auth.ubsId);
        res.set('Cache-Control', 'public, max-age=30');
        res.json(metrics);
    };
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map