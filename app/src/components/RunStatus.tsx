import { Clock3, LoaderCircle, Square } from 'lucide-react'
import type { Job } from '../types'

export default function RunStatus({status}: {status: Job['status']}) {
  return <span className={'run-state ' + status}>
    {status === 'running' && <LoaderCircle className="run-spinner" aria-hidden="true"/>}
    {status === 'queued' && <Clock3 aria-hidden="true"/>}
    {status === 'cancelling' && <Square aria-hidden="true"/>}
    {status}
  </span>
}
