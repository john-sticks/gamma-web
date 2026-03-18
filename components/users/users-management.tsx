'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ROLE_NAMES, type UserRole } from '@/types/auth';
import type { User } from '@/types/auth';
import { Pagination } from '@/components/ui/pagination';
import type { City } from '@/types/city';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function UsersManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [citySearchTerm, setCitySearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'level_4' as UserRole,
    assignedCityIds: [] as string[],
  });

  // Fetch cities
  const { data: cities = [], isLoading: citiesLoading, error: citiesError } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const response = await fetch('/api/cities', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json() as Promise<City[]>;
    },
  });

  // Fetch users with pagination
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users', page, limit, debouncedSearch, filterRole],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterRole !== 'all' && { role: filterRole }),
      });

      const response = await fetch(`/api/users?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json() as Promise<PaginatedResponse<User>>;
    },
  });

  // Users are now filtered by the backend
  const filteredUsers = usersResponse?.data;

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear el usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      resetForm();
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar el usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      toast.success('Usuario actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al eliminar el usuario');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function resetForm() {
    setFormData({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'level_4',
      assignedCityIds: [],
    });
  }

  function handleCreate() {
    createMutation.mutate(formData);
  }

  function handleEdit(user: User) {
    setSelectedUser(user);
    const assignedCities = (user as User & { assignedCities?: City[] }).assignedCities || [];
    setFormData({
      username: user.username,
      password: '', // No pre-fill password
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      assignedCityIds: assignedCities.map((c: City) => c.id),
    });
    setEditDialogOpen(true);
  }

  function handleUpdate() {
    if (!selectedUser) return;
    const updateData: Partial<typeof formData> = {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      assignedCityIds: formData.assignedCityIds,
    };
    if (formData.password) {
      updateData.password = formData.password;
    }
    updateMutation.mutate({ id: selectedUser.id, data: updateData });
  }

  function handleDelete() {
    if (!selectedUser) return;
    deleteMutation.mutate(selectedUser.id);
  }

  function getRoleBadgeVariant(role: UserRole): 'default' | 'secondary' | 'outline' {
    if (role === 'level_1') return 'default';
    if (role === 'level_2') return 'secondary';
    return 'outline';
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-2">
              Administra todos los usuarios del sistema
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Usuario
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Busca y filtra usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    name="user-search-filter"
                    placeholder="Buscar por nombre o usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="level_2">Admin</SelectItem>
                  <SelectItem value="level_3">Moderador</SelectItem>
                  <SelectItem value="level_4">Operador</SelectItem>
                  <SelectItem value="level_5">Solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Usuarios ({usersResponse?.meta.total || 0})
            </CardTitle>
            <CardDescription>Lista de todos los usuarios registrados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando usuarios...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Ciudades Asignadas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers?.map((user) => (
                        <TableRow key={user.id} className="select-none">
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {ROLE_NAMES[user.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.role === 'level_4' && (user as User & { assignedCities?: City[] }).assignedCities ? (
                              <div className="flex flex-wrap gap-1">
                                {((user as User & { assignedCities: City[] }).assignedCities).slice(0, 3).map((city) => (
                                  <Badge key={city.id} variant="outline" className="text-xs">
                                    {city.name}
                                  </Badge>
                                ))}
                                {((user as User & { assignedCities: City[] }).assignedCities).length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{((user as User & { assignedCities: City[] }).assignedCities).length - 3}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'success' : 'destructive'}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(user);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {usersResponse && usersResponse.meta.totalPages > 1 && (
                  <Pagination
                    currentPage={usersResponse.meta.page}
                    totalPages={usersResponse.meta.totalPages}
                    hasNextPage={usersResponse.meta.hasNextPage}
                    hasPreviousPage={usersResponse.meta.hasPreviousPage}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo usuario
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole, assignedCityIds: value === 'level_4' ? formData.assignedCityIds : [] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="level_1">Super Admin</SelectItem>
                  <SelectItem value="level_2">Admin</SelectItem>
                  <SelectItem value="level_3">Moderador</SelectItem>
                  <SelectItem value="level_4">Delegación</SelectItem>
                  <SelectItem value="level_5">Solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'level_4' && (
              <div className="grid gap-2">
                <Label>Ciudades Asignadas</Label>
                <div className="rounded-md border p-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar ciudad..."
                      value={citySearchTerm}
                      onChange={(e) => setCitySearchTerm(e.target.value)}
                      className="pl-8 h-9"
                      autoComplete="off"
                    />
                  </div>
                  <div className="max-h-[140px] overflow-y-auto space-y-1">
                    {cities
                      .filter(c => !formData.assignedCityIds.includes(c.id))
                      .filter(c => c.name.toLowerCase().includes(citySearchTerm.toLowerCase()))
                      .length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2 text-center">No se encontraron ciudades</p>
                      ) : (
                        cities
                          .filter(c => !formData.assignedCityIds.includes(c.id))
                          .filter(c => c.name.toLowerCase().includes(citySearchTerm.toLowerCase()))
                          .map((city) => (
                            <button
                              key={city.id}
                              type="button"
                              className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  assignedCityIds: [...formData.assignedCityIds, city.id],
                                });
                                setCitySearchTerm('');
                              }}
                            >
                              {city.name}
                            </button>
                          ))
                      )}
                  </div>
                  {formData.assignedCityIds.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        {formData.assignedCityIds.length} ciudad{formData.assignedCityIds.length !== 1 ? 'es' : ''} seleccionada{formData.assignedCityIds.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {formData.assignedCityIds.map((cityId) => {
                          const city = cities.find(c => c.id === cityId);
                          return city ? (
                            <Badge
                              key={cityId}
                              variant="secondary"
                              className="pl-2 pr-1 py-1 gap-1"
                            >
                              {city.name}
                              <button
                                type="button"
                                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    assignedCityIds: formData.assignedCityIds.filter(id => id !== cityId),
                                  });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Usuario</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Contraseña (dejar vacío para no cambiar)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-firstName">Nombre</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-lastName">Apellido</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={formData.role} onValueChange={(value) => {
                const newRole = value as UserRole;
                setFormData({
                  ...formData,
                  role: newRole,
                  // Limpiar ciudades si el rol cambia y no es level_4
                  assignedCityIds: newRole === 'level_4' ? formData.assignedCityIds : []
                });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="level_1">Super Admin</SelectItem>
                  <SelectItem value="level_2">Admin</SelectItem>
                  <SelectItem value="level_3">Moderator</SelectItem>
                  <SelectItem value="level_4">Standard User</SelectItem>
                  <SelectItem value="level_5">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'level_4' && (
              <div className="grid gap-2">
                <Label>Ciudades Asignadas</Label>
                {citiesLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando ciudades...</p>
                ) : citiesError ? (
                  <p className="text-sm text-destructive">Error: {citiesError.message}</p>
                ) : (
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar ciudad..."
                        value={citySearchTerm}
                        onChange={(e) => setCitySearchTerm(e.target.value)}
                        className="pl-8 h-9"
                        autoComplete="off"
                      />
                    </div>
                    <div className="max-h-[140px] overflow-y-auto space-y-1">
                      {cities
                        .filter(c => !(formData.assignedCityIds || []).includes(c.id))
                        .filter(c => c.name.toLowerCase().includes(citySearchTerm.toLowerCase()))
                        .length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 text-center">No se encontraron ciudades</p>
                        ) : (
                          cities
                            .filter(c => !(formData.assignedCityIds || []).includes(c.id))
                            .filter(c => c.name.toLowerCase().includes(citySearchTerm.toLowerCase()))
                            .map((city) => (
                              <button
                                key={city.id}
                                type="button"
                                className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    assignedCityIds: [...(formData.assignedCityIds || []), city.id],
                                  });
                                  setCitySearchTerm('');
                                }}
                              >
                                {city.name}
                              </button>
                            ))
                        )}
                    </div>
                    {formData.assignedCityIds && formData.assignedCityIds.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          {formData.assignedCityIds.length} ciudad{formData.assignedCityIds.length !== 1 ? 'es' : ''} seleccionada{formData.assignedCityIds.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.assignedCityIds.map((cityId) => {
                            const city = cities.find(c => c.id === cityId);
                            return city ? (
                              <Badge
                                key={cityId}
                                variant="secondary"
                                className="pl-2 pr-1 py-1 gap-1"
                              >
                                {city.name}
                                <button
                                  type="button"
                                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      assignedCityIds: formData.assignedCityIds?.filter((id) => id !== cityId),
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <span className="font-semibold">{selectedUser?.username}</span>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
