# 🧪 Tests para DateUtils y DateHelper

## Backend - DateUtils Tests

```typescript
import { DateUtils } from '../src/shared/utils/DateUtils';

describe('DateUtils', () => {
  describe('normalizeDate', () => {
    test('debe normalizar string YYYY-MM-DD', () => {
      expect(DateUtils.normalizeDate('2024-02-23')).toBe('2024-02-23');
    });

    test('debe normalizar ISO string', () => {
      expect(DateUtils.normalizeDate('2024-02-23T10:30:00Z')).toBe('2024-02-23');
    });

    test('debe normalizar Date', () => {
      const date = new Date(2024, 1, 23, 10, 30, 0);
      expect(DateUtils.normalizeDate(date)).toBe('2024-02-23');
    });
  });

  describe('isValidDate', () => {
    test('debe validar fecha válida', () => {
      expect(DateUtils.isValidDate('2024-02-23')).toBe(true);
      expect(DateUtils.isValidDate(new Date())).toBe(true);
    });

    test('debe rechazar fecha inválida', () => {
      expect(DateUtils.isValidDate('fecha-invalida')).toBe(false);
      expect(DateUtils.isValidDate(new Date('invalid'))).toBe(false);
    });
  });

  describe('daysDifference', () => {
    test('debe calcular diferencia en días', () => {
      const inicio = new Date('2024-02-20');
      const fin = new Date('2024-02-23');
      expect(DateUtils.daysDifference(inicio, fin)).toBe(3);
    });
  });

  describe('combineDateTime', () => {
    test('debe combinar fecha y hora', () => {
      const result = DateUtils.combineDateTime('2024-02-23', '14:30');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(23);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });
  });
});
```

## Frontend - DateHelper Tests

```typescript
import { DateHelper } from '../src/shared/utils/DateHelper';

describe('DateHelper', () => {
  describe('formatForAPI', () => {
    test('debe formatear para API', () => {
      const date = new Date(2024, 1, 23, 14, 30, 0);
      expect(DateHelper.formatForAPI(date)).toBe('2024-02-23');
    });
  });

  describe('formatDisplay', () => {
    test('debe formatear para display', () => {
      const date = new Date(2024, 1, 23);
      expect(DateHelper.formatDisplay(date)).toMatch(/23.*febrero.*2024/);
    });
  });

  describe('combineDateTime', () => {
    test('debe combinar fecha y hora', () => {
      const result = DateHelper.combineDateTime('2024-02-23', '14:30');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(23);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('getWeekRange', () => {
    test('debe obtener rango de semana', () => {
      const date = new Date(2024, 1, 23); // Viernes 23 de febrero
      const range = DateHelper.getWeekRange(date);
      expect(range.start.getDay()).toBe(1); // Lunes
      expect(range.end.getDay()).toBe(0); // Domingo
    });
  });
});
```

## Tests de Integración

```typescript
describe('Integración Backend-Frontend', () => {
  test('debe mantener consistencia de formatos', () => {
    // Backend
    const backendDate = DateUtils.normalizeDate('2024-02-23T14:30:00Z');
    
    // Frontend
    const frontendDate = DateHelper.formatForAPI(new Date('2024-02-23T14:30:00Z'));
    
    expect(backendDate).toBe(frontendDate);
  });

  test('debe manejar timezone correctamente', () => {
    const utcDate = DateUtils.createDate(2024, 2, 23, 14, 30, 0);
    const localDate = DateHelper.createDate(2024, 2, 23, 14, 30, 0);
    
    // Ambos deben representar el mismo momento pero en diferentes zonas
    expect(utcDate.toISOString()).toContain('T14:30:00Z');
    expect(localDate.getHours()).toBe(14);
  });
});
```

## Tests de Regresión

```typescript
describe('Regresión - Legacy Compatibility', () => {
  test('legacy format debe funcionar con nuevo código', () => {
    // Formato legacy YYYY-MM-DD
    const legacyFormat = '2024-02-23';
    
    // Backend legacy
    const backendLegacy = new Date(legacyFormat + 'T00:00:00');
    
    // Nuevo DateUtils debe manejarlo
    const backendNew = DateUtils.normalizeDate(legacyFormat);
    
    expect(backendLegacy.getFullYear()).toBe(backendNew.getFullYear());
    expect(backendLegacy.getMonth()).toBe(backendNew.getMonth());
    expect(backendLegacy.getDate()).toBe(backendNew.getDate());
  });
});
```
