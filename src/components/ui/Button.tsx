import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
  icon?: ReactNode
}

function cx(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Botón con texto. `primary` solo para la acción principal de cada zona. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'btn',
        variant !== 'secondary' && `btn--${variant}`,
        size === 'sm' && 'btn--sm',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Texto accesible y tooltip: obligatorio porque el botón solo muestra un icono. */
  label: string
  variant?: 'ghost' | 'outline' | 'danger'
}

export function IconButton({
  label,
  variant = 'ghost',
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx('icon-btn', variant !== 'ghost' && `icon-btn--${variant}`, className)}
      {...props}
    >
      {children}
    </button>
  )
}

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean
  tone?: 'default' | 'data'
}

/** Píldora conmutable: filtros, categorías y fuentes de un canal. */
export function Chip({
  pressed,
  tone = 'default',
  className,
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cx('chip', tone === 'data' && 'chip--data', className)}
      {...props}
    />
  )
}
