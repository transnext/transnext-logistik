"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllCustomers,
  formatCustomerType,
  getCustomerTypeColors,
  formatBillingCycle,
  createCustomer,
  updateCustomer,
  setCustomerActive,
  type Customer,
  type CustomerType,
  type BillingCycle,
  type CustomerValidationError
} from "@/lib/customers-api"
import {
  Building2,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react"

export default function KundenPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterActive, setFilterActive] = useState<string>("active")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Form States
  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<CustomerType>("platform")
  const [formBillingCycle, setFormBillingCycle] = useState<BillingCycle>("weekly")
  const [formContactName, setFormContactName] = useState("")
  const [formContactEmail, setFormContactEmail] = useState("")
  const [formContactPhone, setFormContactPhone] = useState("")
  const [formRequiresInvoice, setFormRequiresInvoice] = useState(false)
  const [formActive, setFormActive] = useState(true)

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<CustomerValidationError[]>([])
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }
      const profile = await getUserProfile(user.id)
      const role = profile.role as string
      // Nur Admin/GF erlaubt
      if (role !== 'admin' && role !== 'gf') {
        router.push("/admin/dashboard")
        return
      }
      setUserRole('admin')
      setUserName(profile.full_name)

      await loadCustomers()
      setIsLoading(false)
    } catch {
      router.push("/admin")
    }
  }

  const loadCustomers = async () => {
    try {
      setIsRefreshing(true)
      const data = await getAllCustomers()
      setCustomers(data)
    } catch (err) {
      console.error("Fehler beim Laden:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setSuccessMessage("")
    await loadCustomers()
  }

  const getFieldError = (field: string): string | undefined => {
    return formErrors.find(e => e.field === field)?.message
  }

  const resetForm = () => {
    setFormCode("")
    setFormName("")
    setFormType("platform")
    setFormBillingCycle("weekly")
    setFormContactName("")
    setFormContactEmail("")
    setFormContactPhone("")
    setFormRequiresInvoice(false)
    setFormActive(true)
    setFormErrors([])
  }

  // Kunde hinzufügen Dialog öffnen
  const openCreateDialog = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  // Kunde erstellen
  const handleCreate = async () => {
    setIsSubmitting(true)
    setFormErrors([])

    const result = await createCustomer({
      code: formCode,
      name: formName,
      type: formType,
      billing_cycle: formBillingCycle,
      contact_name: formContactName || undefined,
      contact_email: formContactEmail || undefined,
      contact_phone: formContactPhone || undefined,
      requires_invoice_number: formRequiresInvoice,
      active: formActive
    })

    if (result.success) {
      setCreateDialogOpen(false)
      setSuccessMessage("Kunde erfolgreich angelegt")
      await loadCustomers()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
  }

  // Kunde bearbeiten Dialog öffnen
  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormCode(customer.code)
    setFormName(customer.name)
    setFormType(customer.type)
    setFormBillingCycle(customer.billing_cycle)
    setFormContactName(customer.contact_name || "")
    setFormContactEmail(customer.contact_email || "")
    setFormContactPhone(customer.contact_phone || "")
    setFormRequiresInvoice(customer.requires_invoice_number)
    setFormActive(customer.active)
    setFormErrors([])
    setEditDialogOpen(true)
  }

  // Kunde aktualisieren
  const handleUpdate = async () => {
    if (!selectedCustomer) return
    setIsSubmitting(true)
    setFormErrors([])

    const result = await updateCustomer(selectedCustomer.id, {
      name: formName,
      type: formType,
      billing_cycle: formBillingCycle,
      contact_name: formContactName || null,
      contact_email: formContactEmail || null,
      contact_phone: formContactPhone || null,
      requires_invoice_number: formRequiresInvoice,
      active: formActive
    })

    if (result.success) {
      setEditDialogOpen(false)
      setSuccessMessage("Kunde erfolgreich aktualisiert")
      await loadCustomers()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
  }

  // Kunde aktivieren/deaktivieren
  const handleToggleActive = async (customer: Customer) => {
    const result = await setCustomerActive(customer.id, !customer.active)
    if (result.success) {
      setSuccessMessage(customer.active ? "Kunde deaktiviert" : "Kunde aktiviert")
      await loadCustomers()
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Gefilterte Kunden
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = searchTerm === "" ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || c.type === filterType
      const matchesActive = filterActive === "all" ||
        (filterActive === "active" && c.active) ||
        (filterActive === "inactive" && !c.active)
      return matchesSearch && matchesType && matchesActive
    })
  }, [customers, searchTerm, filterType, filterActive])

  // Zähler
  const counts = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.active).length,
    platform: customers.filter(c => c.type === 'platform').length,
    direct: customers.filter(c => c.type === 'direct_customer').length
  }), [customers])

  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
            <p className="text-gray-500 mt-1">Kundenverwaltung und Auftraggeber</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Kunde hinzufügen
            </Button>
          </div>
        </div>

        {/* Erfolgs-/Admin-Hinweis */}
        {successMessage ? (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">{successMessage}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">Admin-Bereich</p>
                <p className="text-sm text-amber-700">Kundenverwaltung ist nur für Administratoren sichtbar.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{counts.total}</p>
                  <p className="text-xs text-gray-500">Gesamt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold">{counts.active}</p>
                  <p className="text-xs text-gray-500">Aktiv</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{counts.platform}</p>
                  <p className="text-xs text-gray-500">Plattformen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{counts.direct}</p>
                  <p className="text-xs text-gray-500">Direktkunden</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Suche nach Name oder Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full sm:w-40">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Typen</SelectItem>
                    <SelectItem value="platform">Plattform</SelectItem>
                    <SelectItem value="direct_customer">Direktkunde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="active">Nur aktive</SelectItem>
                    <SelectItem value="inactive">Nur inaktive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kunden Tabelle */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg">Kundenliste</CardTitle>
            <CardDescription>
              {filteredCustomers.length} von {customers.length} Kunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <EmptyState
                title="Keine Kunden"
                description={customers.length === 0
                  ? "Es wurden noch keine Kunden angelegt."
                  : "Keine Kunden entsprechen den Filterkriterien."
                }
                icon={<Building2 className="h-12 w-12 text-gray-400" />}
                iconSize="sm"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Abrechnungszyklus</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const typeColors = getCustomerTypeColors(customer.type)

                      return (
                        <TableRow key={customer.id}>
                          <TableCell className="font-mono text-sm">
                            {customer.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {customer.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${typeColors.bg} ${typeColors.text} ${typeColors.border} border text-xs`}>
                              {formatCustomerType(customer.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatBillingCycle(customer.billing_cycle)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {customer.contact_name && (
                              <div>{customer.contact_name}</div>
                            )}
                            {customer.contact_email && (
                              <div className="text-xs text-gray-400">{customer.contact_email}</div>
                            )}
                            {!customer.contact_name && !customer.contact_email && '-'}
                          </TableCell>
                          <TableCell>
                            {customer.active ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs">
                                Aktiv
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-50 text-gray-500 border-gray-200 border text-xs">
                                Inaktiv
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(customer)} title="Bearbeiten">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(customer)}
                                title={customer.active ? "Deaktivieren" : "Aktivieren"}
                                className={customer.active ? "text-gray-500 hover:text-gray-700" : "text-emerald-600 hover:text-emerald-800"}
                              >
                                {customer.active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hinweis zu geplanten Kunden */}
        <Card className="border-gray-100 bg-gray-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-700">Geplante Kunden</p>
                <p>Onlogist, Movecar, Woover/Car4, Direktkunden</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === DIALOGE === */}

      {/* Dialog: Kunde hinzufügen */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neuen Kunden anlegen</DialogTitle>
            <DialogDescription>Erfassen Sie die Kundendaten</DialogDescription>
          </DialogHeader>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-code">Code *</Label>
                <Input id="create-code" value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="z.B. onlogist" />
                {getFieldError('code') && <p className="text-sm text-red-600">{getFieldError('code')}</p>}
                <p className="text-xs text-gray-500">Wird automatisch normalisiert (lowercase, keine Sonderzeichen)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input id="create-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="z.B. Onlogist GmbH" />
                {getFieldError('name') && <p className="text-sm text-red-600">{getFieldError('name')}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CustomerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Plattform</SelectItem>
                    <SelectItem value="direct_customer">Direktkunde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Abrechnungszyklus *</Label>
                <Select value={formBillingCycle} onValueChange={(v) => setFormBillingCycle(v as BillingCycle)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-contact-name">Kontaktname</Label>
              <Input id="create-contact-name" value={formContactName} onChange={e => setFormContactName(e.target.value)} placeholder="Ansprechpartner" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-contact-email">Kontakt-E-Mail</Label>
                <Input id="create-contact-email" type="email" value={formContactEmail} onChange={e => setFormContactEmail(e.target.value)} placeholder="kontakt@kunde.de" />
                {getFieldError('contact_email') && <p className="text-sm text-red-600">{getFieldError('contact_email')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-contact-phone">Kontakt-Telefon</Label>
                <Input id="create-contact-phone" value={formContactPhone} onChange={e => setFormContactPhone(e.target.value)} placeholder="+49 ..." />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="create-requires-invoice" checked={formRequiresInvoice} onCheckedChange={(c) => setFormRequiresInvoice(c === true)} />
              <div>
                <Label htmlFor="create-requires-invoice">Rechnungsnummer erforderlich</Label>
                <p className="text-xs text-gray-500">Bei Auftragserfassung muss Rechnungsnummer angegeben werden</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="create-active" checked={formActive} onCheckedChange={(c) => setFormActive(c === true)} />
              <div>
                <Label htmlFor="create-active">Aktiv</Label>
                <p className="text-xs text-gray-500">Kunde kann für Aufträge ausgewählt werden</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Kunde anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Kunde bearbeiten */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kunde bearbeiten</DialogTitle>
            <DialogDescription>{selectedCustomer?.name}</DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">Der Code dient als technische Referenz und kann nach Erstellung nicht geändert werden.</p>
          </div>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={formCode} disabled className="bg-gray-50 font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input id="edit-name" value={formName} onChange={e => setFormName(e.target.value)} />
                {getFieldError('name') && <p className="text-sm text-red-600">{getFieldError('name')}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CustomerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Plattform</SelectItem>
                    <SelectItem value="direct_customer">Direktkunde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Abrechnungszyklus</Label>
                <Select value={formBillingCycle} onValueChange={(v) => setFormBillingCycle(v as BillingCycle)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-name">Kontaktname</Label>
              <Input id="edit-contact-name" value={formContactName} onChange={e => setFormContactName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contact-email">Kontakt-E-Mail</Label>
                <Input id="edit-contact-email" type="email" value={formContactEmail} onChange={e => setFormContactEmail(e.target.value)} />
                {getFieldError('contact_email') && <p className="text-sm text-red-600">{getFieldError('contact_email')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact-phone">Kontakt-Telefon</Label>
                <Input id="edit-contact-phone" value={formContactPhone} onChange={e => setFormContactPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="edit-requires-invoice" checked={formRequiresInvoice} onCheckedChange={(c) => setFormRequiresInvoice(c === true)} />
              <div>
                <Label htmlFor="edit-requires-invoice">Rechnungsnummer erforderlich</Label>
                <p className="text-xs text-gray-500">Bei Auftragserfassung muss Rechnungsnummer angegeben werden</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="edit-active" checked={formActive} onCheckedChange={(c) => setFormActive(c === true)} />
              <div>
                <Label htmlFor="edit-active">Aktiv</Label>
                <p className="text-xs text-gray-500">Kunde kann für Aufträge ausgewählt werden</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
