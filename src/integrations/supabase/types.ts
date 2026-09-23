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
  public: {
    Tables: {
      aula_horario_ocupacao: {
        Row: {
          horario_id: string
          quantidade: number
        }
        Insert: {
          horario_id: string
          quantidade?: number
        }
        Update: {
          horario_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "aula_horario_ocupacao_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: true
            referencedRelation: "aula_horarios"
            referencedColumns: ["id"]
          },
        ]
      }
      aula_horarios: {
        Row: {
          aula_id: string
          duracao_minutos: number
          id: string
          inicio: string
        }
        Insert: {
          aula_id: string
          duracao_minutos: number
          id?: string
          inicio: string
        }
        Update: {
          aula_id?: string
          duracao_minutos?: number
          id?: string
          inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_horarios_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          apagada_em: string | null
          created_at: string
          descricao: string
          id: string
          local: string | null
          materia_id: string
          max_alunos: number | null
          modo: string | null
          preco: number | null
          selo: string | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          apagada_em?: string | null
          created_at?: string
          descricao: string
          id?: string
          local?: string | null
          materia_id: string
          max_alunos?: number | null
          modo?: string | null
          preco?: number | null
          selo?: string | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          apagada_em?: string | null
          created_at?: string
          descricao?: string
          id?: string
          local?: string | null
          materia_id?: string
          max_alunos?: number | null
          modo?: string | null
          preco?: number | null
          selo?: string | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          comentario: string | null
          created_at: string
          id: string
          inscricao_id: string
          nota: number
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          id?: string
          inscricao_id: string
          nota: number
        }
        Update: {
          comentario?: string | null
          created_at?: string
          id?: string
          inscricao_id?: string
          nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "inscricoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          created_at: string
          id: string
          lido: boolean
          texto: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lido?: boolean
          texto: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lido?: boolean
          texto?: string
          usuario_id?: string
        }
        Relationships: []
      }
      conversas: {
        Row: {
          aluno_id: string
          aula_id: string
          created_at: string
          id: string
          tutor_id: string
        }
        Insert: {
          aluno_id: string
          aula_id: string
          created_at?: string
          id?: string
          tutor_id: string
        }
        Update: {
          aluno_id?: string
          aula_id?: string
          created_at?: string
          id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      inscricoes: {
        Row: {
          aluno_id: string
          aula_id: string
          cancelada_em: string | null
          created_at: string
          horario_id: string
          id: string
        }
        Insert: {
          aluno_id: string
          aula_id: string
          cancelada_em?: string | null
          created_at?: string
          horario_id: string
          id?: string
        }
        Update: {
          aluno_id?: string
          aula_id?: string
          cancelada_em?: string | null
          created_at?: string
          horario_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "aula_horarios"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          created_at: string
          id: string
          nome: string
          nome_normalizado: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          nome_normalizado: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          nome_normalizado?: string
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          autor_id: string
          conversa_id: string
          created_at: string
          id: string
          texto: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          autor_id: string
          conversa_id: string
          created_at?: string
          id?: string
          texto?: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          autor_id?: string
          conversa_id?: string
          created_at?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          aviso_nova_mensagem: boolean
          aviso_resumo_semanal: boolean
          created_at: string
          curso_id: string | null
          foto_url: string | null
          id: string
          nome: string
        }
        Insert: {
          aviso_nova_mensagem?: boolean
          aviso_resumo_semanal?: boolean
          created_at?: string
          curso_id?: string | null
          foto_url?: string | null
          id: string
          nome?: string
        }
        Update: {
          aviso_nova_mensagem?: boolean
          aviso_resumo_semanal?: boolean
          created_at?: string
          curso_id?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_materias: {
        Row: {
          created_at: string
          materia_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          materia_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          materia_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirmar_inscricao: {
        Args: { p_aula_id: string; p_horario_id: string }
        Returns: string
      }
      publicar_aula: {
        Args: {
          p_descricao: string
          p_horarios: Json
          p_local: string
          p_materia_id: string
          p_max_alunos: number
          p_modo: string
          p_preco: number
          p_selo: string
        }
        Returns: string
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
