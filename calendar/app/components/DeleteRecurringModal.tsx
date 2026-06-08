'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useT } from '../lib/i18n/useT'

interface Props {
  open: boolean
  onClose: () => void
  onDeleteOne: () => void
  onDeleteFuture: () => void
}

export function DeleteRecurringModal({ open, onClose, onDeleteOne, onDeleteFuture }: Props) {
  const { t } = useT()
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xs overflow-hidden bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            {t('deleteRecurring.title')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground/60 -mt-1 mb-1">
          {t('deleteRecurring.subtitle')}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onDeleteOne}
            className="group w-full text-left rounded-lg border border-border px-4 py-3 transition-colors hover:border-rose-200 hover:bg-rose-50/60"
          >
            <p className="text-[13px] font-medium text-foreground group-hover:text-rose-600 transition-colors">
              {t('deleteRecurring.thisOnly')}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {t('deleteRecurring.thisOnlyDesc')}
            </p>
          </button>

          <button
            onClick={onDeleteFuture}
            className="group w-full text-left rounded-lg border border-border px-4 py-3 transition-colors hover:border-rose-200 hover:bg-rose-50/60"
          >
            <p className="text-[13px] font-medium text-foreground group-hover:text-rose-600 transition-colors">
              {t('deleteRecurring.future')}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {t('deleteRecurring.futureDesc')}
            </p>
          </button>
        </div>

        <div className="flex justify-end mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
