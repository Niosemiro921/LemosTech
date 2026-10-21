import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../../src/modules/analytics/presentation/analytics.controller';
import { AnalyticsEventDto } from '../../src/modules/analytics/dto/analytics.dto';
import { AnalyticsEventType, AnalyticsArea } from '../../src/modules/analytics/dto/analytics.dto';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should track analytics event successfully', async () => {
      const dto: AnalyticsEventDto = {
        sessionId: 'test-session-123',
        eventType: AnalyticsEventType.PAGE_VIEW,
        area: AnalyticsArea.CUSTOMER,
        path: '/pedir',
        target: 'menu-item',
      };

      const result = await controller.trackEvent(dto);
      expect(result).toEqual({ tracked: true });
      // Should log to console (no persistence)
    });

    it('should track event without optional target', async () => {
      const dto: AnalyticsEventDto = {
        sessionId: 'test-session-456',
        eventType: AnalyticsEventType.CLICK,
        area: AnalyticsArea.PUBLIC,
        path: '/login',
      };

      const result = await controller.trackEvent(dto);
      expect(result).toEqual({ tracked: true });
    });

    it('should accept all area values', async () => {
      for (const area of Object.values(AnalyticsArea)) {
        const dto: AnalyticsEventDto = {
          sessionId: `test-session-${area}`,
          eventType: AnalyticsEventType.PAGE_VIEW,
          area: area,
          path: '/',
        };
        const result = await controller.trackEvent(dto);
        expect(result).toEqual({ tracked: true });
      }
    });
  });
});