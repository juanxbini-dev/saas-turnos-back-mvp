import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { VentaProducto } from '../../../domain/entities/Comision';
import { MetodoPago } from '../../../domain/entities/Turno';
import { generarId, calcularComisionProducto } from '../../../shared/utils/calculos.utils';
import { normalizarCanjeDetalle } from '../../../shared/utils/canje.utils';

export interface CreateVentaDirectaItem {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  precio_costo?: number;
  es_venta_costo?: boolean;
  fecha_venta?: string | null;
}

export interface CreateVentaDirectaData {
  empresa_id: string;
  vendedor_id: string;
  cliente_id?: string | null;
  metodo_pago: MetodoPago;
  notas?: string;
  // Texto libre del canje: solo se persiste cuando metodo_pago = 'canje'
  // (el mismo texto va a todos los items del grupo).
  canje_detalle?: string | null;
  items: CreateVentaDirectaItem[];
}

export class CreateVentaDirectaUseCase {
  constructor(
    private ventaProductoRepository: IVentaProductoRepository,
    private usuarioRepository: IUsuarioRepository,
    private catalogoProductoRepository?: IProductoRepository
  ) {}

  async execute(data: CreateVentaDirectaData): Promise<VentaProducto[]> {
    if (!data.items || data.items.length === 0) {
      throw Object.assign(new Error('Debe incluir al menos un producto'), { statusCode: 400 });
    }

    for (const item of data.items) {
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        throw Object.assign(new Error('La cantidad debe ser un entero positivo'), { statusCode: 400 });
      }
      if (item.precio_unitario < 0) {
        throw Object.assign(new Error('El precio no puede ser negativo'), { statusCode: 400 });
      }
    }

    const vendedor = await this.usuarioRepository.findById(data.vendedor_id);
    if (!vendedor) {
      throw Object.assign(new Error('Vendedor no encontrado'), { statusCode: 404 });
    }

    const comisionPct = Number(vendedor.comision_producto) ?? 0;
    const creados: VentaProducto[] = [];
    const grupoId = generarId(); // mismo ID para todos los items de esta compra
    // Canje = entrega gratis: se guarda el detalle con importes en 0.
    // El costo_unitario_snapshot SÍ se guarda (informativo) y el stock se descuenta normal.
    const esCanje = data.metodo_pago === 'canje';
    // Un solo detalle por operación: el mismo texto para todos los items del grupo.
    const canjeDetalle = esCanje ? normalizarCanjeDetalle(data.canje_detalle) : null;

    for (const item of data.items) {
      // Obtener nombre y costo del producto desde catálogo si existe
      let nombreProducto = `Producto ${item.producto_id}`;
      let costoUnitario: number | null = null;
      if (this.catalogoProductoRepository) {
        const prod = await this.catalogoProductoRepository.findById(item.producto_id);
        if (prod) {
          nombreProducto = prod.nombre;
          costoUnitario = prod.costo != null ? Number(prod.costo) : null;
        }
      }
      if (item.es_venta_costo && item.precio_costo != null) {
        costoUnitario = Number(item.precio_costo);
      }

      const precioUnitario = esCanje ? 0 : item.precio_unitario;
      const precioTotal = precioUnitario * item.cantidad;
      // Comisión sobre la ganancia (precio - costo), no sobre el total. Canje → todo en 0.
      const { netoVendedor, comisionMonto } = esCanje
        ? { netoVendedor: 0, comisionMonto: 0 }
        : calcularComisionProducto(precioTotal, costoUnitario, item.cantidad, comisionPct);

      const creado = await this.ventaProductoRepository.create({
        empresa_id: data.empresa_id,
        vendedor_id: data.vendedor_id,
        cliente_id: data.cliente_id ?? null,
        turno_id: null,
        venta_grupo_id: grupoId,
        producto_id: item.producto_id,
        nombre_producto: nombreProducto,
        cantidad: item.cantidad,
        precio_unitario: precioUnitario,
        precio_total: precioTotal,
        metodo_pago: data.metodo_pago,
        comision_porcentaje: comisionPct,
        comision_monto: comisionMonto,
        neto_vendedor: netoVendedor,
        fecha_venta: item.fecha_venta ?? null,
        es_venta_costo: item.es_venta_costo ?? false,
        costo_unitario_snapshot: costoUnitario,
        canje_detalle: canjeDetalle,
      });

      if (this.catalogoProductoRepository) {
        await this.catalogoProductoRepository.deductStock(item.producto_id, item.cantidad);
      }

      creados.push(creado);
    }

    return creados;
  }
}
