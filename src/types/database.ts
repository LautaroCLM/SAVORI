
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categorias": {
                  Row: {
                    "activa": boolean,"created_at": string,"id": string,"nombre": string,"orden": number,"restaurante_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"created_at"?: string,"id"?: string,"nombre": string,"orden"?: number,"restaurante_id": string
                  }
                  Update: {
                    "activa"?: boolean,"created_at"?: string,"id"?: string,"nombre"?: string,"orden"?: number,"restaurante_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    }
                  ]
                },"invitaciones": {
                  Row: {
                    "codigo": string,"creada_por": string | null,"created_at": string,"expira_at": string,"id": string,"restaurante_id": string,"revocada": boolean,"rol": Database["public"]['Enums']["rol_usuario"],"usada_at": string | null,"usada_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"creada_por"?: string | null,"created_at"?: string,"expira_at"?: string,"id"?: string,"restaurante_id": string,"revocada"?: boolean,"rol": Database["public"]['Enums']["rol_usuario"],"usada_at"?: string | null,"usada_por"?: string | null
                  }
                  Update: {
                    "codigo"?: string,"creada_por"?: string | null,"created_at"?: string,"expira_at"?: string,"id"?: string,"restaurante_id"?: string,"revocada"?: boolean,"rol"?: Database["public"]['Enums']["rol_usuario"],"usada_at"?: string | null,"usada_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitaciones_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    }
                  ]
                },"mesas": {
                  Row: {
                    "alto": number,"ancho": number,"capacidad": number,"created_at": string,"estado": Database["public"]['Enums']["estado_mesa"],"forma": Database["public"]['Enums']["forma_mesa"],"id": string,"numero": number,"qr_token": string,"restaurante_id": string,"rotacion": number,"salon_id": string,"updated_at": string,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alto"?: number,"ancho"?: number,"capacidad"?: number,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_mesa"],"forma"?: Database["public"]['Enums']["forma_mesa"],"id"?: string,"numero": number,"qr_token"?: string,"restaurante_id": string,"rotacion"?: number,"salon_id": string,"updated_at"?: string,"x"?: number,"y"?: number
                  }
                  Update: {
                    "alto"?: number,"ancho"?: number,"capacidad"?: number,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_mesa"],"forma"?: Database["public"]['Enums']["forma_mesa"],"id"?: string,"numero"?: number,"qr_token"?: string,"restaurante_id"?: string,"rotacion"?: number,"salon_id"?: string,"updated_at"?: string,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "mesas_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mesas_restaurante_id_salon_id_fkey"
      columns: ["restaurante_id","salon_id"]
isOneToOne: false
      referencedRelation: "salones"
      referencedColumns: ["restaurante_id","id"]
    }
                  ]
                },"movimientos_stock": {
                  Row: {
                    "cantidad": number,"created_at": string,"id": string,"motivo": string | null,"pedido_id": string | null,"producto_id": string,"restaurante_id": string,"tipo": Database["public"]['Enums']["tipo_movimiento_stock"],"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"created_at"?: string,"id"?: string,"motivo"?: string | null,"pedido_id"?: string | null,"producto_id": string,"restaurante_id": string,"tipo": Database["public"]['Enums']["tipo_movimiento_stock"],"usuario_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"created_at"?: string,"id"?: string,"motivo"?: string | null,"pedido_id"?: string | null,"producto_id"?: string,"restaurante_id"?: string,"tipo"?: Database["public"]['Enums']["tipo_movimiento_stock"],"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_stock_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_restaurante_id_pedido_id_fkey"
      columns: ["restaurante_id","pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["restaurante_id","id"]
    },{
      foreignKeyName: "movimientos_stock_restaurante_id_producto_id_fkey"
      columns: ["restaurante_id","producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["restaurante_id","id"]
    }
                  ]
                },"pedido_items": {
                  Row: {
                    "cantidad": number,"costo_unitario": number,"created_at": string,"id": string,"nombre_snapshot": string,"notas": string | null,"pedido_id": string,"precio_unitario": number,"producto_id": string | null,"restaurante_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"costo_unitario"?: number,"created_at"?: string,"id"?: string,"nombre_snapshot": string,"notas"?: string | null,"pedido_id": string,"precio_unitario": number,"producto_id"?: string | null,"restaurante_id": string
                  }
                  Update: {
                    "cantidad"?: number,"costo_unitario"?: number,"created_at"?: string,"id"?: string,"nombre_snapshot"?: string,"notas"?: string | null,"pedido_id"?: string,"precio_unitario"?: number,"producto_id"?: string | null,"restaurante_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_items_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_items_restaurante_id_pedido_id_fkey"
      columns: ["restaurante_id","pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["restaurante_id","id"]
    },{
      foreignKeyName: "pedido_items_restaurante_id_producto_id_fkey"
      columns: ["restaurante_id","producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["restaurante_id","id"]
    }
                  ]
                },"pedidos": {
                  Row: {
                    "creado_por": string | null,"created_at": string,"estado": Database["public"]['Enums']["estado_pedido"],"id": string,"mesa_id": string,"notas": string | null,"origen": Database["public"]['Enums']["origen_pedido"],"restaurante_id": string,"sesion_id": string | null,"total": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_por"?: string | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_pedido"],"id"?: string,"mesa_id": string,"notas"?: string | null,"origen": Database["public"]['Enums']["origen_pedido"],"restaurante_id": string,"sesion_id"?: string | null,"total"?: number,"updated_at"?: string
                  }
                  Update: {
                    "creado_por"?: string | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_pedido"],"id"?: string,"mesa_id"?: string,"notas"?: string | null,"origen"?: Database["public"]['Enums']["origen_pedido"],"restaurante_id"?: string,"sesion_id"?: string | null,"total"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_restaurante_id_mesa_id_fkey"
      columns: ["restaurante_id","mesa_id"]
isOneToOne: false
      referencedRelation: "mesas"
      referencedColumns: ["restaurante_id","id"]
    },{
      foreignKeyName: "pedidos_restaurante_id_sesion_id_fkey"
      columns: ["restaurante_id","sesion_id"]
isOneToOne: false
      referencedRelation: "sesiones_mesa"
      referencedColumns: ["restaurante_id","id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": string,"nombre": string,"restaurante_id": string,"rol": Database["public"]['Enums']["rol_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id": string,"nombre": string,"restaurante_id": string,"rol": Database["public"]['Enums']["rol_usuario"]
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: string,"nombre"?: string,"restaurante_id"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfiles_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    }
                  ]
                },"productos": {
                  Row: {
                    "categoria_id": string,"controla_stock": boolean,"costo": number,"created_at": string,"descripcion": string | null,"disponible": boolean,"id": string,"imagen_url": string | null,"nombre": string,"orden": number,"precio": number,"restaurante_id": string,"stock_actual": number,"stock_minimo": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id": string,"controla_stock"?: boolean,"costo"?: number,"created_at"?: string,"descripcion"?: string | null,"disponible"?: boolean,"id"?: string,"imagen_url"?: string | null,"nombre": string,"orden"?: number,"precio": number,"restaurante_id": string,"stock_actual"?: number,"stock_minimo"?: number,"updated_at"?: string
                  }
                  Update: {
                    "categoria_id"?: string,"controla_stock"?: boolean,"costo"?: number,"created_at"?: string,"descripcion"?: string | null,"disponible"?: boolean,"id"?: string,"imagen_url"?: string | null,"nombre"?: string,"orden"?: number,"precio"?: number,"restaurante_id"?: string,"stock_actual"?: number,"stock_minimo"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_restaurante_id_categoria_id_fkey"
      columns: ["restaurante_id","categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["restaurante_id","id"]
    },{
      foreignKeyName: "productos_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    }
                  ]
                },"restaurantes": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": string,"nombre": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id"?: string,"nombre": string,"slug": string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: string,"nombre"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"salones": {
                  Row: {
                    "created_at": string,"id": string,"nombre": string,"orden": number,"restaurante_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nombre": string,"orden"?: number,"restaurante_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nombre"?: string,"orden"?: number,"restaurante_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "salones_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    }
                  ]
                },"sesiones_mesa": {
                  Row: {
                    "abierta_at": string,"abierta_por": string | null,"cerrada_at": string | null,"id": string,"mesa_id": string,"metodo_pago": Database["public"]['Enums']["metodo_pago"] | null,"restaurante_id": string,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "abierta_at"?: string,"abierta_por"?: string | null,"cerrada_at"?: string | null,"id"?: string,"mesa_id": string,"metodo_pago"?: Database["public"]['Enums']["metodo_pago"] | null,"restaurante_id": string,"total"?: number
                  }
                  Update: {
                    "abierta_at"?: string,"abierta_por"?: string | null,"cerrada_at"?: string | null,"id"?: string,"mesa_id"?: string,"metodo_pago"?: Database["public"]['Enums']["metodo_pago"] | null,"restaurante_id"?: string,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sesiones_mesa_restaurante_id_fkey"
      columns: ["restaurante_id"]
isOneToOne: false
      referencedRelation: "restaurantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sesiones_mesa_restaurante_id_mesa_id_fkey"
      columns: ["restaurante_id","mesa_id"]
isOneToOne: false
      referencedRelation: "mesas"
      referencedColumns: ["restaurante_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_mover_stock":
{ Args: { "p_delta": number,"p_motivo": string,"p_pedido_id": string,"p_producto_id": string }; Returns: undefined
                           },
"crear_mi_restaurante":
{ Args: { "p_mi_nombre": string,"p_nombre_restaurante": string }; Returns: string
                           },
"crear_pedido_mozo":
{ Args: { "p_items": Json,"p_mesa_id": string,"p_notas"?: string }; Returns: Json
                           },
"crear_pedido_qr":
{ Args: { "p_items": Json,"p_notas"?: string,"p_token": string }; Returns: Json
                           },
"generar_codigo_invitacion":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"generar_invitacion":
{ Args: { "p_rol": Database["public"]['Enums']["rol_usuario"] }; Returns: string
                           },
"generar_qr_token":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mi_contexto":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"mi_restaurante_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mi_rol":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol_usuario"]
                           },
"obtener_carta":
{ Args: { "p_token": string }; Returns: Json
                           },
"productos_mas_vendidos":
{ Args: { "p_desde": string,"p_hasta": string,"p_limite"?: number }; Returns: {
              "ganancia": number,"ingresos": number,"nombre": string,"unidades": number
            }[]
                           },
"regenerar_qr_mesa":
{ Args: { "p_mesa_id": string }; Returns: string
                           },
"registrar_movimiento_stock":
{ Args: { "p_cantidad": number,"p_motivo"?: string,"p_producto_id": string,"p_tipo": Database["public"]['Enums']["tipo_movimiento_stock"] }; Returns: number
                           },
"resumen_ganancias":
{ Args: { "p_agrupar"?: string,"p_desde": string,"p_hasta": string }; Returns: {
              "costos": number,"ganancia": number,"ingresos": number,"pedidos": number,"periodo": string,"unidades": number
            }[]
                           },
"unirme_con_codigo":
{ Args: { "p_codigo": string,"p_mi_nombre": string }; Returns: string
                           }
          }
          Enums: {
            "estado_mesa": "libre"|"ocupada","estado_pedido": "pendiente"|"en_preparacion"|"listo"|"entregado"|"cancelado","forma_mesa": "cuadrada"|"redonda"|"rectangular","metodo_pago": "efectivo"|"debito"|"credito"|"transferencia"|"mercadopago"|"otro","origen_pedido": "qr"|"mozo","rol_usuario": "admin"|"mozo"|"cocina","tipo_movimiento_stock": "entrada"|"salida"|"ajuste"|"venta"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "estado_mesa": ["libre", "ocupada"],"estado_pedido": ["pendiente", "en_preparacion", "listo", "entregado", "cancelado"],"forma_mesa": ["cuadrada", "redonda", "rectangular"],"metodo_pago": ["efectivo", "debito", "credito", "transferencia", "mercadopago", "otro"],"origen_pedido": ["qr", "mozo"],"rol_usuario": ["admin", "mozo", "cocina"],"tipo_movimiento_stock": ["entrada", "salida", "ajuste", "venta"]
          }
        }
} as const
