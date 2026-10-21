import { validate } from 'class-validator';
import { AnalyticsEventDto, AnalyticsEventType, AnalyticsArea } from '../../src/modules/analytics/dto/analytics.dto';

describe('AnalyticsEventDto', () => {
  it('should pass validation with all required fields', async () => {
    const dto = new AnalyticsEventDto();
    dto.sessionId = 'session-abc';
    dto.eventType = AnalyticsEventType.PAGE_VIEW;
    dto.area = AnalyticsArea.DRIVER;
    dto.path = '/driver/perfil';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when sessionId is missing', async () => {
    const dto = new AnalyticsEventDto();
    dto.eventType = AnalyticsEventType.CLICK;
    dto.area = AnalyticsArea.CUSTOMER;
    dto.path = '/';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('sessionId');
  });

  it('should fail when eventType is invalid', async () => {
    const dto = new AnalyticsEventDto();
    dto.sessionId = 's';
    (dto as any).eventType = 'INVALID';
    dto.area = AnalyticsArea.ADMIN;
    dto.path = '/admin';

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'eventType')).toBe(true);
  });

  it('should allow optional target', async () => {
    const dto = new AnalyticsEventDto();
    dto.sessionId = 's-1';
    dto.eventType = AnalyticsEventType.CLICK;
    dto.area = AnalyticsArea.SUPPLIER;
    dto.path = '/fornecedor';
    dto.target = 'button-id';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});