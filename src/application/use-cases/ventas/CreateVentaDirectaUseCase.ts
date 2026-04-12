import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { VentaProducto } from '../../../domain/entities/Comision';
import { MetodoPago } from '../../../domain/entities/Turno';
import { generarId } from '../../../shared/utils/calculos.utils';

export interface CreateVentaDirectaItem {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CreateVentaDirectaData {
  empresa_id: string;
  vendedor_id: string;
  cliente_id?: string | null;
  metodo_pago: MetodoPago;
  notas?: string;
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

    for (const item of data.items) {
      const precioTotal = item.precio_unitario * item.cantidad;
      const netoVendedor = precioTotal * comisionPct / 100;
      const comisionMonto = precioTotal - netoVendedor;

      // Obtener nombre del producto desde catálogo si existe
      let nombreProducto = `Producto ${item.producto_id}`;
      if (this.catalogoProductoRepository) {
        const prod = await this.catalogoProductoRepository.findById(item.producto_id);
        if (prod) nombreProducto = prod.nombre;
      }

      const creado = await this.ventaProductoRepository.create({
        empresa_id: data.empresa_id,
        vendedor_id: data.vendedor_id,
        cliente_id: data.cliente_id ?? null,
        turno_id: null,
        venta_grupo_id: grupoId,
        producto_id: item.producto_id,
        nombre_producto: nombreProducto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_total: precioTotal,
        metodo_pago: data.metodo_pago,
        comision_porcentaje: comisionPct,
        comision_monto: comisionMonto,
        neto_vendedor: netoVendedor,
      });

      if (this.catalogoProductoRepository) {
        await this.catalogoProductoRepository.deductStock(item.producto_id, item.cantidad);
      }

      creados.push(creado);
    }

    return creados;
  }
}
