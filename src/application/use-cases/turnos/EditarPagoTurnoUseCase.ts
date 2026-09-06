import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { IComisionRepository } from '../../../domain/repositories/IComisionRepository';
import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';
import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Turno, EditarPagoData } from '../../../domain/entities/Turno';
import { calcularComisiones, calcularComisionProducto } from '../../../shared/utils/calculos.utils';
import { normalizarCanjeDetalle } from '../../../shared/utils/canje.utils';
import { DateUtils } from '../../../shared/utils/DateUtils';

export class EditarPagoTurnoUseCase {
  constructor(
    private turnoRepository: ITurnoRepository,
    private usuarioRepository: IUsuarioRepository,
    private comisionRepository: IComisionRepository,
    private ventaProductoRepository: IVentaProductoRepository,
    private catalogoProductoRepository?: IProductoRepository
  ) {}

  async execute(data: EditarPagoData): Promise<Turno> {
    // 1. Validar que el turno exista y esté completado
    const turno = await this.turnoRepository.findById(data.turnoId);
    if (!turno) {
      throw Object.assign(new Error('Turno no encontrado'), { statusCode: 404 });
    }
    if (turno.estado !== 'completado') {
      throw Object.assign(new Error('Solo se puede editar el pago de turnos completados'), { statusCode: 400 });
    }

    // 2. Obtener configuración de comisiones del profesional
    const profesional = await this.usuarioRepository.findById(data.profesionalId);
    if (!profesional) {
      throw Object.assign(new Error('Profesional no encontrado'), { statusCode: 404 });
    }

    // 3. Calcular nuevos totales
    // Canje = entrega gratis: se guarda el detalle pero todos los importes van en 0.
    const esCanjeServicio = data.metodoPago === 'canje';
    // Un solo texto por operación. Si el servicio deja de ser canje, turnos.canje_detalle
    // vuelve a NULL (ídem por producto al recrear las ventas).
    const canjeDetalle = normalizarCanjeDetalle(data.canjeDetalle);
    const precioServicio = (data.precioModificado !== undefined && data.precioModificado !== null)
      ? Number(data.precioModificado)
      : Number(turno.precio);
    // Los productos canjeados no aportan al monto (importe 0)
    const montoProductos = data.productos?.reduce((sum, p) => {
      const esCanjeProducto = (p.metodo_pago ?? data.metodoPago) === 'canje';
      return sum + (esCanjeProducto ? 0 : Number(p.precio_total));
    }, 0) || 0;

    const calculo = calcularComisiones(
      esCanjeServicio ? 0 : precioServicio,
      montoProductos,
      data.descuentoPorcentaje || 0,
      {
        comision_turno: profesional.comision_turno ?? 0,
        comision_producto: profesional.comision_producto ?? 0
      },
      data.descuentoAplicarA
    );

    // 4. Actualizar turno con los nuevos valores de pago
    const turnoActualizado = await this.turnoRepository.finalizar(data.turnoId, {
      metodoPago: data.metodoPago,
      precio_original: precioServicio,
      descuentoPorcentaje: data.descuentoPorcentaje || 0,
      descuento_monto: calculo.descuentoMonto,
      total_final: calculo.totalConDescuento,
      canje_detalle: esCanjeServicio ? canjeDetalle : null,
    });

    // 5. Actualizar productos si se enviaron
    if (data.productos !== undefined) {
      await this.ventaProductoRepository.deleteByTurno(data.turnoId);

      if (data.productos.length > 0) {
        const comisionProductoPct = profesional.comision_producto ?? 0;

        for (const producto of data.productos) {
          // Canje (por producto o heredado del turno): todos los importes en 0.
          // El costo_unitario_snapshot SÍ se guarda (informativo).
          const esCanjeProducto = (producto.metodo_pago ?? data.metodoPago) === 'canje';
          const precioUnitario = esCanjeProducto ? 0 : Number(producto.precio_unitario);
          const precioTotal = esCanjeProducto ? 0 : Number(producto.precio_total);
          // Costo del producto para calcular la comisión sobre la ganancia
          let costoUnitario: number | null = null;
          if (producto.es_venta_costo) {
            costoUnitario = Number(producto.precio_unitario);
          } else if (producto.producto_id && this.catalogoProductoRepository) {
            const prod = await this.catalogoProductoRepository.findById(producto.producto_id);
            costoUnitario = prod?.costo != null ? Number(prod.costo) : null;
          }
          const { netoVendedor, comisionMonto } = esCanjeProducto
            ? { netoVendedor: 0, comisionMonto: 0 }
            : calcularComisionProducto(precioTotal, costoUnitario, producto.cantidad, comisionProductoPct);
          await this.ventaProductoRepository.create({
            empresa_id: data.empresaId,
            vendedor_id: data.profesionalId,
            cliente_id: turno.cliente_id ?? null,
            turno_id: data.turnoId,
            producto_id: producto.producto_id || null,
            nombre_producto: producto.nombre_producto,
            cantidad: producto.cantidad,
            precio_unitario: precioUnitario,
            precio_total: precioTotal,
            metodo_pago: producto.metodo_pago ?? data.metodoPago,
            comision_porcentaje: comisionProductoPct,
            comision_monto: comisionMonto,
            neto_vendedor: netoVendedor,
            // Al recrear las ventas del turno, la fecha se conserva: sin esto la
            // edición de pago volvía a dejar fecha_venta NULL (invisible en el tab Ventas)
            fecha_venta: DateUtils.normalizeDate(turno.fecha),
            es_venta_costo: producto.es_venta_costo ?? false,
            costo_unitario_snapshot: costoUnitario,
            canje_detalle: esCanjeProducto ? canjeDetalle : null,
          });
        }
      }
    }

    // 6. Actualizar comisión del servicio
    await this.comisionRepository.updateByTurno(data.turnoId, {
      servicio_monto: calculo.comisionServicio.base,
      servicio_comision_porcentaje: calculo.comisionServicio.porcentajeEmpresa,
      servicio_comision_monto: calculo.comisionServicio.montoEmpresa,
      servicio_neto_profesional: calculo.comisionServicio.netoProfesional,
    });

    return turnoActualizado;
  }
}
