import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../../src/modules/analytics/presentation/analytics.controller';
import { AnalyticsService } from '../../src/modules/analytics/application/analytics.service';
import { AnalyticsEventDto } from '../../src/modules/analytics/dto/analytics.dto';
import { AnalyticsEventType, AnalyticsArea } from '../../src/modules/analytics/dto/analytics.dto';
import { ActiveAccountGuard } from '../../src/modules/auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const track = vi.fn(async (dto: AnalyticsEventDto) => ({ id: 'event-1', ...dto }));

  beforeEach(async () => {
    track.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: { track, summarize: vi.fn() } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ActiveAccountGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
      expect(result.tracked).toBe(true);
      expect(result.event).toMatchObject(dto);
      expect(track).toHaveBeenCalledWith(dto);
    });

    it('should track event without optional target', async () => {
      const dto: AnalyticsEventDto = {
        sessionId: 'test-session-456',
        eventType: AnalyticsEventType.CLICK,
        area: AnalyticsArea.PUBLIC,
        path: '/login',
      };

      const result = await controller.trackEvent(dto);
      expect(result.tracked).toBe(true);
      expect(result.event).toMatchObject(dto);
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
        expect(result.tracked).toBe(true);
      }
    });
  });
});
