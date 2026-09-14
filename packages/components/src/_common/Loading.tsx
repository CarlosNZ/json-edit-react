import css from './style.css?inline'
import { useStyles } from './useStyles'

export const Loading = ({ text = 'Loading' }: { text?: string }) => {
  useStyles('jer-loading', css)
  return <div className="jer-simple-loader">{text}...</div>
}
