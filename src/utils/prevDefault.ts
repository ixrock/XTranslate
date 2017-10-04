// Helper for preventing default event action and performing custom callback
// 1)
// <form>
//    {/* Press <Enter> will perform onClick() action at submit button without actual sending form */}
//    <input name="text"/>
//    <button type="submit" onClick={prevDefault(() => console.log('do some action'))}>Action</button>
// </form>
// 2)
// <a href="/some-page-url">
//  <span>Link text</span>
//  <Icon onClick={prevDefault(() => console.log('stay on the page and open dialog'))}/>
// </a>

export function prevDefault(callback: (evt: Event) => any) {
  return function (evt) {
    evt.preventDefault();
    evt.stopPropagation();
    return callback(evt);
  }
}
