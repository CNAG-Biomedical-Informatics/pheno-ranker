import { ArrowLeftRight, ChartColumn, ChartScatter, FileText, FlaskConical, QrCode, ScanLine, Sheet, UserRound, UsersRound, Wrench } from 'lucide-react'

const icons = {
  cohort: UsersRound,
  projection: ChartScatter,
  simulate: FlaskConical,
  csv: Sheet,
  summary: ChartColumn,
  'qr-encode': QrCode,
  'qr-decode': ScanLine,
  pdf: FileText,
}

export default function ToolIcon({operation}: {operation: string}) {
  if (operation === 'patient') return <span aria-hidden="true" className="tool-icon patient-icon"><UserRound/><ArrowLeftRight/><UsersRound/></span>
  const Icon = icons[operation as keyof typeof icons] || Wrench
  return <Icon aria-hidden="true" className="tool-icon"/>
}
