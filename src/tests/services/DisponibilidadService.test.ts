/**
 * Tests unitarios de DisponibilidadService.
 *
 * Cubre los métodos:
 *   - calcularSlotsDisponibles (incluyendo el nuevo parámetro `vacaciones`)
 *   - validarSlotDisponible    (que ahora propaga vacaciones a calcularSlotsDisponibles)
 *
 * El servicio es puro: no hay repositorios, no hay DB. Se instancia directo.
 *
 * Las fechas son absolutas (2026-06-15 = lunes) para que los tests sean
 * deterministas independiente de cuándo corran. Sin embargo, validarSlotDisponible
 * internamente usa calcularDiasDisponiblesMes que excluye días pasados, así que
 * para tests de validarSlotDisponible se usa una fecha futura.
 */

import { DisponibilidadService } from '../../domain/services/DisponibilidadService';
import {
  DisponibilidadSemanal,
  DiasVacacion,
  ExcepcionDia,
} from '../../domain/entities/Disponibilidad';
import { BloqueoSlot } from '../../domain/entities/BloqueoSlot';
import { Turno } from '../../domain/entities/Turno';

// ── Factories ─────────────────────────────────────────────────────────────────

function buildDisponibilidadSemanal(
  overrides: Partial<DisponibilidadSemanal> = {}
): DisponibilidadSemanal {
  return {
    id: 'disp-001',
    profesional_id: 'prof-001',
    dia_inicio: 1,            // Lunes
    dia_fin: 5,               // Viernes
    hora_inicio: '09:00',
    hora_fin: '12:00',
    intervalo_minutos: 30,
    activo: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildVacacion(overrides: Partial<DiasVacacion> = {}): DiasVacacion {
  return {
    id: 'vac-001',
    profesional_id: 'prof-001',
    fecha: '2026-06-15',
    fecha_fin: null,
    tipo: 'vacacion',
    motivo: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildExcepcion(overrides: Partial<ExcepcionDia> = {}): ExcepcionDia {
  return {
    id: 'exc-001',
    profesional_id: 'prof-001',
    fecha: '2026-06-15',
    disponible: true,
    tipo: 'reemplazo',
    hora_inicio: null,
    hora_fin: null,
    intervalo_minutos: null,
    notas: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildTurno(overrides: Partial<Turno> = {}): Turno {
  return {
    id: 'turno-001',
    cliente_id: 'cli-001',
    usuario_id: 'prof-001',
    servicio_id: 'srv-001',
    fecha: '2026-06-15',
    hora: '10:00',
    estado: 'confirmado',
    notas: null,
    servicio: 'Corte',
    precio: 1000,
    duracion_minutos: 30,
    empresa_id: 'empresa-001',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildBloqueoSlot(overrides: Partial<BloqueoSlot> = {}): BloqueoSlot {
  return {
    id: 'blq-001',
    empresa_id: 'empresa-001',
    profesional_id: 'prof-001',
    fecha: '2026-06-15',
    hora_inicio: '10:00',
    hora_fin: '11:00',
    motivo: null,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DisponibilidadService', () => {
  const service = new DisponibilidadService();
  const FECHA_LUNES = '2026-06-15'; // Lunes

  // ── calcularSlotsDisponibles ────────────────────────────────────────────────

  describe('calcularSlotsDisponibles', () => {

    describe('horario base sin nada más', () => {
      it('genera slots cada intervalo_minutos entre hora_inicio y hora_fin', () => {
        const disponibilidades = [buildDisponibilidadSemanal()];
        const slots = service.calcularSlotsDisponibles(
          disponibilidades,
          [],
          [],
          FECHA_LUNES,
          [],
          0,
          []
        );
        // 09:00-12:00 cada 30 min → 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
        expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
      });

      it('retorna [] si el día de la semana no tiene disponibilidad activa', () => {
        // Lunes a Viernes activos, pero pedimos un sábado (2026-06-20)
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          [],
          '2026-06-20',
          [],
          0,
          []
        );
        expect(slots).toEqual([]);
      });
    });

    // ── VACACIONES (cambio nuevo) ───────────────────────────────────────────

    describe('vacaciones', () => {
      it('vacación de un solo día (sin fecha_fin) que coincide con la fecha → []', () => {
        const vacaciones = [buildVacacion({ fecha: FECHA_LUNES, fecha_fin: null })];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          [],
          FECHA_LUNES,
          [],
          0,
          vacaciones
        );
        expect(slots).toEqual([]);
      });

      it('vacación con rango (fecha y fecha_fin) donde la fecha está adentro → []', () => {
        const vacaciones = [
          buildVacacion({ fecha: '2026-06-10', fecha_fin: '2026-06-20' }),
        ];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          [],
          FECHA_LUNES, // Está dentro del rango [10, 20]
          [],
          0,
          vacaciones
        );
        expect(slots).toEqual([]);
      });

      it('vacación cuyo rango NO incluye la fecha → genera slots normalmente', () => {
        const vacaciones = [
          buildVacacion({ fecha: '2026-07-01', fecha_fin: '2026-07-10' }),
        ];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          [],
          FECHA_LUNES,
          [],
          0,
          vacaciones
        );
        expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
      });

      it('vacación en la fecha + excepción adicional → solo los slots de la adicional (omite horario base)', () => {
        // Las vacaciones se tratan simétrico a `excepcionNoDisponible`: si hay
        // una excepción adicional, se omite el horario base y se devuelven
        // SOLO los slots de la adicional.
        const vacaciones = [buildVacacion({ fecha: FECHA_LUNES, fecha_fin: null })];
        const excepciones = [
          buildExcepcion({
            id: 'exc-add',
            fecha: FECHA_LUNES,
            disponible: true,
            tipo: 'adicional',
            hora_inicio: '15:00',
            hora_fin: '16:00',
            intervalo_minutos: 30,
          }),
        ];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          excepciones,
          [],
          FECHA_LUNES,
          [],
          0,
          vacaciones
        );
        // Solo los slots de la adicional, sin el horario semanal
        expect(slots).toEqual(['15:00', '15:30']);
      });

      it('por defecto (sin pasar `vacaciones`) usa array vacío y no bloquea nada', () => {
        // El parámetro es opcional con default = []
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          [],
          FECHA_LUNES
        );
        expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
      });
    });

    // ── EXCEPCIONES (regresión) ─────────────────────────────────────────────

    describe('excepciones', () => {
      it('excepción disponible:false tipo:reemplazo sin adicional → []', () => {
        const excepciones = [
          buildExcepcion({
            fecha: FECHA_LUNES,
            disponible: false,
            tipo: 'reemplazo',
          }),
        ];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          excepciones,
          [],
          FECHA_LUNES,
          [],
          0,
          []
        );
        expect(slots).toEqual([]);
      });

      it('excepción disponible:false + excepción adicional → solo los slots de la adicional', () => {
        const excepciones = [
          buildExcepcion({
            id: 'exc-bloqueo',
            fecha: FECHA_LUNES,
            disponible: false,
            tipo: 'reemplazo',
          }),
          buildExcepcion({
            id: 'exc-adicional',
            fecha: FECHA_LUNES,
            disponible: true,
            tipo: 'adicional',
            hora_inicio: '16:00',
            hora_fin: '17:00',
            intervalo_minutos: 30,
          }),
        ];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          excepciones,
          [],
          FECHA_LUNES,
          [],
          0,
          []
        );
        expect(slots).toEqual(['16:00', '16:30']);
      });

      it('excepción disponible:true tipo:reemplazo con horario → sustituye horario base', () => {
        const excepciones = [
          buildExcepcion({
            fecha: FECHA_LUNES,
            disponible: true,
            tipo: 'reemplazo',
            hora_inicio: '14:00',
            hora_fin: '16:00',
            intervalo_minutos: 60,
          }),
        ];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          excepciones,
          [],
          FECHA_LUNES,
          [],
          0,
          []
        );
        // Horario semanal era 09-12 cada 30; lo reemplaza 14-16 cada 60 → 14:00, 15:00
        expect(slots).toEqual(['14:00', '15:00']);
      });
    });

    // ── TURNOS EXISTENTES ───────────────────────────────────────────────────

    describe('turnos existentes', () => {
      it('turno no cancelado a las 10:00 → ese slot se filtra', () => {
        const turnos = [buildTurno({ hora: '10:00', estado: 'confirmado' })];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          turnos,
          FECHA_LUNES,
          [],
          0,
          []
        );
        expect(slots).not.toContain('10:00');
        expect(slots).toEqual(['09:00', '09:30', '10:30', '11:00', '11:30']);
      });

      it('turno cancelado NO bloquea el slot', () => {
        const turnos = [buildTurno({ hora: '10:00', estado: 'cancelado' })];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          turnos,
          FECHA_LUNES,
          [],
          0,
          []
        );
        expect(slots).toContain('10:00');
      });

      it('con duracionMinutos > 0 y turno existente que pisa parcialmente → bloquea por overlap', () => {
        // Turno a las 10:00 con duración 60 ocupa [10:00, 11:00).
        // Pedimos slots de 60 min → 09:30 (09:30-10:30) y 10:00 (10:00-11:00)
        // y 10:30 (10:30-11:30) se solapan con el turno.
        const turnos = [buildTurno({ hora: '10:00', duracion_minutos: 60 })];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          turnos,
          FECHA_LUNES,
          [],
          60, // duracionMinutos
          []
        );
        expect(slots).not.toContain('09:30');
        expect(slots).not.toContain('10:00');
        expect(slots).not.toContain('10:30');
        // 09:00 (09:00-10:00) no se solapa (toca pero no overlap)
        expect(slots).toContain('09:00');
        // 11:00 (11:00-12:00) no se solapa
        expect(slots).toContain('11:00');
      });
    });

    // ── BLOQUEOS DE SLOT ────────────────────────────────────────────────────

    // ── SLOTS PASADOS DEL DÍA ACTUAL (hora de Argentina, UTC-3) ─────────────
    describe('filtro de slots pasados (hoy AR)', () => {
      afterEach(() => {
        jest.useRealTimers();
      });

      // Disponibilidad amplia para tener slots a la mañana y a la tarde.
      const dispDiaCompleto = () => [
        buildDisponibilidadSemanal({ hora_inicio: '09:00', hora_fin: '18:00', intervalo_minutos: 60 }),
      ];

      it('si la fecha es HOY (AR), descarta los slots cuya hora ya pasó', () => {
        // 15:30 AR = 18:30 UTC del lunes 2026-06-15
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-06-15T18:30:00Z'));

        const slots = service.calcularSlotsDisponibles(
          dispDiaCompleto(), [], [], FECHA_LUNES, [], 0, []
        );
        // Quedan solo los slots posteriores a 15:30 AR
        expect(slots).toEqual(['16:00', '17:00']);
      });

      it('el slot que coincide exacto con la hora actual queda fuera (comparación estricta)', () => {
        // 16:00 AR = 19:00 UTC
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-06-15T19:00:00Z'));

        const slots = service.calcularSlotsDisponibles(
          dispDiaCompleto(), [], [], FECHA_LUNES, [], 0, []
        );
        expect(slots).not.toContain('16:00');
        expect(slots).toEqual(['17:00']);
      });

      it('si la fecha NO es hoy (futuro), no filtra ningún slot por hora', () => {
        // Hoy es 2026-06-15 pero pedimos el martes 2026-06-16
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-06-15T18:30:00Z'));

        const slots = service.calcularSlotsDisponibles(
          dispDiaCompleto(), [], [], '2026-06-16', [], 0, []
        );
        expect(slots).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']);
      });

      it('caso borde de medianoche AR: 2026-06-15 23:30 AR no descarta slots del 2026-06-16', () => {
        // 23:30 AR del 15 = 02:30 UTC del 16. La fecha AR sigue siendo el 15.
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-06-16T02:30:00Z'));

        // Para el día siguiente (16) no se filtra nada
        const slots = service.calcularSlotsDisponibles(
          dispDiaCompleto(), [], [], '2026-06-16', [], 0, []
        );
        expect(slots[0]).toBe('09:00');
      });
    });

    describe('bloqueos de slot', () => {
      it('BloqueoSlot 10:00-11:00 filtra todos los slots dentro de [10:00, 11:00)', () => {
        const bloqueos = [
          buildBloqueoSlot({ hora_inicio: '10:00', hora_fin: '11:00' }),
        ];
        const slots = service.calcularSlotsDisponibles(
          [buildDisponibilidadSemanal()],
          [],
          [],
          FECHA_LUNES,
          bloqueos,
          0,
          []
        );
        // 10:00 y 10:30 dentro del bloqueo, 11:00 NO (rango exclusivo del fin)
        expect(slots).not.toContain('10:00');
        expect(slots).not.toContain('10:30');
        expect(slots).toContain('11:00');
        expect(slots).toEqual(['09:00', '09:30', '11:00', '11:30']);
      });
    });
  });

  // ── validarSlotDisponible ───────────────────────────────────────────────────

  describe('validarSlotDisponible', () => {
    // calcularDiasDisponiblesMes (que validarSlotDisponible llama internamente)
    // excluye días pasados. Para que estos tests sean robustos, fijamos "hoy"
    // a una fecha anterior a FECHA_LUNES usando jest.useFakeTimers().
    const FECHA_DOMINGO = '2026-06-14';

    beforeAll(() => {
      jest.useFakeTimers();
      // 2026-06-01 mediodía UTC → cae el 1 de junio en cualquier zona horaria
      // razonable (UTC-12 a UTC+14)
      jest.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('slot en día sin disponibilidad semanal → false', () => {
      // Domingo (no incluido en dia_inicio:1, dia_fin:5)
      const ok = service.validarSlotDisponible(
        [buildDisponibilidadSemanal()],
        [],
        [],
        [],
        FECHA_DOMINGO,
        '10:00',
        [],
        0
      );
      expect(ok).toBe(false);
    });

    it('slot en día de vacaciones → false (verifica propagación de vacaciones)', () => {
      const vacaciones = [
        buildVacacion({ fecha: FECHA_LUNES, fecha_fin: null }),
      ];
      const ok = service.validarSlotDisponible(
        [buildDisponibilidadSemanal()],
        [],
        [],
        vacaciones,
        FECHA_LUNES,
        '10:00',
        [],
        0
      );
      expect(ok).toBe(false);
    });

    it('slot en día con horario y sin conflictos → true', () => {
      const ok = service.validarSlotDisponible(
        [buildDisponibilidadSemanal()],
        [],
        [],
        [],
        FECHA_LUNES,
        '10:00',
        [],
        0
      );
      expect(ok).toBe(true);
    });

    it('slot con duracionMinutos que se solapa con turno existente → false', () => {
      // Turno a las 10:00 dur 60 ocupa [10:00, 11:00). Pedimos slot 10:30 con dur 30:
      // [10:30, 11:00) se solapa con el turno.
      const turnos = [
        buildTurno({
          fecha: FECHA_LUNES,
          hora: '10:00',
          duracion_minutos: 60,
        }),
      ];
      const ok = service.validarSlotDisponible(
        [buildDisponibilidadSemanal()],
        [],
        turnos,
        [],
        FECHA_LUNES,
        '10:30',
        [],
        30
      );
      expect(ok).toBe(false);
    });
  });

  describe('horario cortado (múltiples rangos por día)', () => {
    const FECHA_LUNES = '2026-06-15';

    it('genera slots de los dos rangos cuando hay dos disponibilidades del mismo día', () => {
      // Lun-Vie 09:00-11:00 y Lun-Vie 17:00-19:00, intervalo 60
      const disponibilidades = [
        buildDisponibilidadSemanal({ id: 'd1', hora_inicio: '09:00', hora_fin: '11:00', intervalo_minutos: 60 }),
        buildDisponibilidadSemanal({ id: 'd2', hora_inicio: '17:00', hora_fin: '19:00', intervalo_minutos: 60 }),
      ];
      const slots = service.calcularSlotsDisponibles(
        disponibilidades,
        [],
        [],
        FECHA_LUNES
      );
      expect(slots).toEqual(['09:00', '10:00', '17:00', '18:00']);
    });

    it('los slots quedan ordenados cronológicamente aunque los rangos vengan desordenados', () => {
      const disponibilidades = [
        buildDisponibilidadSemanal({ id: 'd-tarde', hora_inicio: '17:00', hora_fin: '19:00', intervalo_minutos: 60 }),
        buildDisponibilidadSemanal({ id: 'd-manana', hora_inicio: '09:00', hora_fin: '11:00', intervalo_minutos: 60 }),
      ];
      const slots = service.calcularSlotsDisponibles(disponibilidades, [], [], FECHA_LUNES);
      expect(slots).toEqual(['09:00', '10:00', '17:00', '18:00']);
    });

    it('un turno en un rango no afecta los slots del otro rango', () => {
      const disponibilidades = [
        buildDisponibilidadSemanal({ id: 'd1', hora_inicio: '09:00', hora_fin: '11:00', intervalo_minutos: 60 }),
        buildDisponibilidadSemanal({ id: 'd2', hora_inicio: '17:00', hora_fin: '19:00', intervalo_minutos: 60 }),
      ];
      const turnos = [buildTurno({ fecha: FECHA_LUNES, hora: '09:00', duracion_minutos: 60 })];
      const slots = service.calcularSlotsDisponibles(disponibilidades, [], turnos, FECHA_LUNES);
      // 09:00 ocupado; el resto disponible
      expect(slots).toEqual(['10:00', '17:00', '18:00']);
    });

    it('con duración que no cabe en un rango pero sí en el otro, solo ofrece el que cabe', () => {
      // Rango mañana 09:00-10:00 (1h), rango tarde 17:00-20:00 (3h). Servicio de 120 min.
      const disponibilidades = [
        buildDisponibilidadSemanal({ id: 'd1', hora_inicio: '09:00', hora_fin: '10:00', intervalo_minutos: 60 }),
        buildDisponibilidadSemanal({ id: 'd2', hora_inicio: '17:00', hora_fin: '20:00', intervalo_minutos: 60 }),
      ];
      const slots = service.calcularSlotsDisponibles(
        disponibilidades, [], [], FECHA_LUNES, [], 120
      );
      // 09:00 no cabe (solo 1h). 17:00 y 18:00 sí (terminan 19:00/20:00 dentro del rango)
      expect(slots).toEqual(['17:00', '18:00']);
    });

    it('una disponibilidad inactiva no aporta slots aunque cubra el día', () => {
      const disponibilidades = [
        buildDisponibilidadSemanal({ id: 'd1', hora_inicio: '09:00', hora_fin: '11:00', intervalo_minutos: 60 }),
        buildDisponibilidadSemanal({ id: 'd2', hora_inicio: '17:00', hora_fin: '19:00', intervalo_minutos: 60, activo: false }),
      ];
      const slots = service.calcularSlotsDisponibles(disponibilidades, [], [], FECHA_LUNES);
      expect(slots).toEqual(['09:00', '10:00']);
    });
  });
});
