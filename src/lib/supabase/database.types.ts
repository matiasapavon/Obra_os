export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      adicionales: {
        Row: {
          aprobado_por: string | null
          costo_estimado: number | null
          costo_real: number | null
          created_at: string
          deleted_at: string | null
          descripcion: string
          estado: string
          evidencia_url: string | null
          fecha: string
          id: string
          lo_paga: string | null
          notas: string | null
          obra_id: string
          origen: string | null
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string
          deleted_at?: string | null
          descripcion: string
          estado?: string
          evidencia_url?: string | null
          fecha?: string
          id?: string
          lo_paga?: string | null
          notas?: string | null
          obra_id: string
          origen?: string | null
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string
          deleted_at?: string | null
          descripcion?: string
          estado?: string
          evidencia_url?: string | null
          fecha?: string
          id?: string
          lo_paga?: string | null
          notas?: string | null
          obra_id?: string
          origen?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adicionales_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencias: {
        Row: {
          captured_at: string
          created_at: string
          created_offline: boolean
          deleted_at: string | null
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          id: string
          medio_dia: boolean
          obra_id: string
          observacion: string | null
          personal_id: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          medio_dia?: boolean
          obra_id: string
          observacion?: string | null
          personal_id: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          medio_dia?: boolean
          obra_id?: string
          observacion?: string | null
          personal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      compromisos: {
        Row: {
          concepto: string
          created_at: string
          deleted_at: string | null
          estado: string
          fecha_estimada_pago: string | null
          gremio_id: string | null
          id: string
          monto_pagado: number
          monto_total: number
          notas: string | null
          obra_id: string
          rubro_id: string | null
          updated_at: string
        }
        Insert: {
          concepto: string
          created_at?: string
          deleted_at?: string | null
          estado?: string
          fecha_estimada_pago?: string | null
          gremio_id?: string | null
          id?: string
          monto_pagado?: number
          monto_total: number
          notas?: string | null
          obra_id: string
          rubro_id?: string | null
          updated_at?: string
        }
        Update: {
          concepto?: string
          created_at?: string
          deleted_at?: string | null
          estado?: string
          fecha_estimada_pago?: string | null
          gremio_id?: string | null
          id?: string
          monto_pagado?: number
          monto_total?: number
          notas?: string | null
          obra_id?: string
          rubro_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compromisos_gremio_id_fkey"
            columns: ["gremio_id"]
            isOneToOne: false
            referencedRelation: "gremios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromisos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromisos_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
        ]
      }
      dependencias_tareas: {
        Row: {
          created_at: string
          depende_de_tarea_id: string
          id: string
          tarea_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depende_de_tarea_id: string
          id?: string
          tarea_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depende_de_tarea_id?: string
          id?: string
          tarea_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependencias_tareas_depende_de_tarea_id_fkey"
            columns: ["depende_de_tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencias_tareas_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_obra: {
        Row: {
          captured_at: string
          clima: string | null
          created_at: string
          created_offline: boolean
          deleted_at: string | null
          etiquetas: string[]
          fecha: string
          id: string
          obra_id: string
          texto: string | null
          updated_at: string
        }
        Insert: {
          captured_at?: string
          clima?: string | null
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          etiquetas?: string[]
          fecha?: string
          id?: string
          obra_id: string
          texto?: string | null
          updated_at?: string
        }
        Update: {
          captured_at?: string
          clima?: string | null
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          etiquetas?: string[]
          fecha?: string
          id?: string
          obra_id?: string
          texto?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          created_at: string
          deleted_at: string | null
          estado: string
          fecha_fin_plan: string | null
          fecha_fin_real: string | null
          fecha_inicio_plan: string | null
          fecha_inicio_real: string | null
          id: string
          nombre: string
          obra_id: string
          orden: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          estado?: string
          fecha_fin_plan?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_plan?: string | null
          fecha_inicio_real?: string | null
          id?: string
          nombre: string
          obra_id: string
          orden?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          estado?: string
          fecha_fin_plan?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_plan?: string | null
          fecha_inicio_real?: string | null
          id?: string
          nombre?: string
          obra_id?: string
          orden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos: {
        Row: {
          captured_at: string
          created_at: string
          created_offline: boolean
          deleted_at: string | null
          diario_id: string | null
          estado_upload: string
          fecha: string
          id: string
          obra_id: string
          stock_evento_id: string | null
          tarea_id: string | null
          thumbnail_url: string | null
          ubicacion_texto: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          diario_id?: string | null
          estado_upload?: string
          fecha?: string
          id?: string
          obra_id: string
          stock_evento_id?: string | null
          tarea_id?: string | null
          thumbnail_url?: string | null
          ubicacion_texto?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          diario_id?: string | null
          estado_upload?: string
          fecha?: string
          id?: string
          obra_id?: string
          stock_evento_id?: string | null
          tarea_id?: string | null
          thumbnail_url?: string | null
          ubicacion_texto?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fotos_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diario_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_stock_evento_id_fkey"
            columns: ["stock_evento_id"]
            isOneToOne: false
            referencedRelation: "stock_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          adicional_id: string | null
          comprobante_url: string | null
          concepto: string
          created_at: string
          deleted_at: string | null
          fecha: string
          gremio_id: string | null
          id: string
          medio_pago: string | null
          moneda: string
          monto: number
          notas: string | null
          obra_id: string
          rubro_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          adicional_id?: string | null
          comprobante_url?: string | null
          concepto: string
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          gremio_id?: string | null
          id?: string
          medio_pago?: string | null
          moneda?: string
          monto: number
          notas?: string | null
          obra_id: string
          rubro_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          adicional_id?: string | null
          comprobante_url?: string | null
          concepto?: string
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          gremio_id?: string | null
          id?: string
          medio_pago?: string | null
          moneda?: string
          monto?: number
          notas?: string | null
          obra_id?: string
          rubro_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_adicional_id_fkey"
            columns: ["adicional_id"]
            isOneToOne: false
            referencedRelation: "adicionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_gremio_id_fkey"
            columns: ["gremio_id"]
            isOneToOne: false
            referencedRelation: "gremios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
        ]
      }
      gremios: {
        Row: {
          calificacion: number | null
          contacto_nombre: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          especialidad: string | null
          forma_pago: string | null
          id: string
          nombre: string
          notas: string | null
          obra_id: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          calificacion?: number | null
          contacto_nombre?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          especialidad?: string | null
          forma_pago?: string | null
          id?: string
          nombre: string
          notas?: string | null
          obra_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          calificacion?: number | null
          contacto_nombre?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          especialidad?: string | null
          forma_pago?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          obra_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gremios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      ingresos: {
        Row: {
          adicional_id: string | null
          concepto: string | null
          created_at: string
          deleted_at: string | null
          fecha: string
          id: string
          moneda: string
          monto: number
          notas: string | null
          obra_id: string
          updated_at: string
        }
        Insert: {
          adicional_id?: string | null
          concepto?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          id?: string
          moneda?: string
          monto: number
          notas?: string | null
          obra_id: string
          updated_at?: string
        }
        Update: {
          adicional_id?: string | null
          concepto?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          id?: string
          moneda?: string
          monto?: number
          notas?: string | null
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingresos_adicional_id_fkey"
            columns: ["adicional_id"]
            isOneToOne: false
            referencedRelation: "adicionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      ingresos_gremios: {
        Row: {
          confirmado: boolean
          created_at: string
          deleted_at: string | null
          fecha_ingreso_plan: string | null
          fecha_ingreso_real: string | null
          gremio_id: string
          id: string
          notas: string | null
          obra_id: string
          tarea_id: string | null
          updated_at: string
        }
        Insert: {
          confirmado?: boolean
          created_at?: string
          deleted_at?: string | null
          fecha_ingreso_plan?: string | null
          fecha_ingreso_real?: string | null
          gremio_id: string
          id?: string
          notas?: string | null
          obra_id: string
          tarea_id?: string | null
          updated_at?: string
        }
        Update: {
          confirmado?: boolean
          created_at?: string
          deleted_at?: string | null
          fecha_ingreso_plan?: string | null
          fecha_ingreso_real?: string | null
          gremio_id?: string
          id?: string
          notas?: string | null
          obra_id?: string
          tarea_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingresos_gremios_gremio_id_fkey"
            columns: ["gremio_id"]
            isOneToOne: false
            referencedRelation: "gremios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_gremios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_gremios_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      materiales: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          lead_time_dias: number | null
          nombre: string
          obra_id: string
          proveedor_habitual: string | null
          rubro_id: string | null
          unidad: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          lead_time_dias?: number | null
          nombre: string
          obra_id: string
          proveedor_habitual?: string | null
          rubro_id?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          lead_time_dias?: number | null
          nombre?: string
          obra_id?: string
          proveedor_habitual?: string | null
          rubro_id?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiales_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiales_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente: string | null
          created_at: string
          deleted_at: string | null
          direccion: string | null
          estado: string
          fecha_fin_estimada: string | null
          fecha_inicio: string | null
          id: string
          moneda: string
          nombre: string
          notas: string | null
          superficie_m2: number | null
          updated_at: string
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          estado?: string
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          moneda?: string
          nombre: string
          notas?: string | null
          superficie_m2?: number | null
          updated_at?: string
        }
        Update: {
          cliente?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          estado?: string
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          moneda?: string
          nombre?: string
          notas?: string | null
          superficie_m2?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pedidos_materiales: {
        Row: {
          cantidad: number | null
          costo_estimado: number | null
          costo_real: number | null
          created_at: string
          created_offline: boolean
          deleted_at: string | null
          estado: string
          fecha_entrega_estimada: string | null
          fecha_entrega_real: string | null
          fecha_necesidad: string | null
          fecha_pedido: string | null
          gasto_id: string | null
          id: string
          material_id: string
          notas: string | null
          obra_id: string
          proveedor: string | null
          updated_at: string
        }
        Insert: {
          cantidad?: number | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          estado?: string
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_necesidad?: string | null
          fecha_pedido?: string | null
          gasto_id?: string | null
          id?: string
          material_id: string
          notas?: string | null
          obra_id: string
          proveedor?: string | null
          updated_at?: string
        }
        Update: {
          cantidad?: number | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          estado?: string
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_necesidad?: string | null
          fecha_pedido?: string | null
          gasto_id?: string | null
          id?: string
          material_id?: string
          notas?: string | null
          obra_id?: string
          proveedor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_materiales_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_materiales_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_materiales_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          art_vencimiento: string | null
          created_at: string
          deleted_at: string | null
          gremio_id: string | null
          id: string
          nombre: string
          obra_id: string | null
          rol: string | null
          seguro_vencimiento: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          art_vencimiento?: string | null
          created_at?: string
          deleted_at?: string | null
          gremio_id?: string | null
          id?: string
          nombre: string
          obra_id?: string | null
          rol?: string | null
          seguro_vencimiento?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          art_vencimiento?: string | null
          created_at?: string
          deleted_at?: string | null
          gremio_id?: string | null
          id?: string
          nombre?: string
          obra_id?: string | null
          rol?: string | null
          seguro_vencimiento?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_gremio_id_fkey"
            columns: ["gremio_id"]
            isOneToOne: false
            referencedRelation: "gremios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nombre: string | null
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          nombre?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string | null
          role?: string
        }
        Relationships: []
      }
      rubros: {
        Row: {
          created_at: string
          deleted_at: string | null
          es_sistema: boolean
          id: string
          nombre: string
          notas: string | null
          obra_id: string
          presupuesto_base: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          es_sistema?: boolean
          id?: string
          nombre: string
          notas?: string | null
          obra_id: string
          presupuesto_base?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          es_sistema?: boolean
          id?: string
          nombre?: string
          notas?: string | null
          obra_id?: string
          presupuesto_base?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubros_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_eventos: {
        Row: {
          cantidad_aprox: number | null
          captured_at: string
          created_at: string
          created_offline: boolean
          deleted_at: string | null
          fecha: string
          foto_url: string | null
          id: string
          material_id: string | null
          obra_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          cantidad_aprox?: number | null
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          fecha?: string
          foto_url?: string | null
          id?: string
          material_id?: string | null
          obra_id: string
          tipo: string
          updated_at?: string
        }
        Update: {
          cantidad_aprox?: number | null
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          fecha?: string
          foto_url?: string | null
          id?: string
          material_id?: string | null
          obra_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_eventos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_eventos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          captured_at: string
          created_at: string
          created_offline: boolean
          deleted_at: string | null
          descripcion: string | null
          estado: string
          etapa_id: string | null
          fecha_fin_plan: string | null
          fecha_fin_real: string | null
          fecha_inicio_plan: string | null
          fecha_inicio_real: string | null
          gremio_id: string | null
          id: string
          nombre: string
          obra_id: string
          orden: number
          porcentaje_avance: number
          rubro_id: string | null
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          descripcion?: string | null
          estado?: string
          etapa_id?: string | null
          fecha_fin_plan?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_plan?: string | null
          fecha_inicio_real?: string | null
          gremio_id?: string | null
          id?: string
          nombre: string
          obra_id: string
          orden?: number
          porcentaje_avance?: number
          rubro_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          created_offline?: boolean
          deleted_at?: string | null
          descripcion?: string | null
          estado?: string
          etapa_id?: string | null
          fecha_fin_plan?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_plan?: string | null
          fecha_inicio_real?: string | null
          gremio_id?: string | null
          id?: string
          nombre?: string
          obra_id?: string
          orden?: number
          porcentaje_avance?: number
          rubro_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_gremio_id_fkey"
            columns: ["gremio_id"]
            isOneToOne: false
            referencedRelation: "gremios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
        ]
      }
      vencimientos_admin: {
        Row: {
          alerta_dias_antes: number
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          estado: string
          fecha_vencimiento: string
          id: string
          obra_id: string
          responsable: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          alerta_dias_antes?: number
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_vencimiento: string
          id?: string
          obra_id: string
          responsable?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          alerta_dias_antes?: number
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_vencimiento?: string
          id?: string
          obra_id?: string
          responsable?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vencimientos_admin_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pedidos_materiales_campo: {
        Row: {
          cantidad: number | null
          created_at: string | null
          created_offline: boolean | null
          estado: string | null
          fecha_entrega_estimada: string | null
          fecha_entrega_real: string | null
          fecha_necesidad: string | null
          fecha_pedido: string | null
          id: string | null
          material_id: string | null
          notas: string | null
          obra_id: string | null
          proveedor: string | null
          updated_at: string | null
        }
        Insert: {
          cantidad?: number | null
          created_at?: string | null
          created_offline?: boolean | null
          estado?: string | null
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_necesidad?: string | null
          fecha_pedido?: string | null
          id?: string | null
          material_id?: string | null
          notas?: string | null
          obra_id?: string | null
          proveedor?: string | null
          updated_at?: string | null
        }
        Update: {
          cantidad?: number | null
          created_at?: string | null
          created_offline?: boolean | null
          estado?: string | null
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_necesidad?: string | null
          fecha_pedido?: string | null
          id?: string | null
          material_id?: string | null
          notas?: string | null
          obra_id?: string | null
          proveedor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_materiales_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_materiales_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_app_role: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
